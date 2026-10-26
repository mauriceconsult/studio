import { NextRequest, NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { assetFromImageGeneration } from "@/lib/assets";
import { deleteObject, signedUrl } from "@/lib/r2";
import { quoteImage } from "@/lib/pricing/quote";
import { pricingRailForOrg } from "@/lib/pricing/rail";
import { generateStill } from "@/lib/stills/provider";
import { assertActiveSubscription } from "@/lib/subscription-guard";

export const maxDuration = 60;

const SCENE_SIZES = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1024, height: 1024 },
} as const;
const MOTIONS = ["zoom_in", "pan_left", "zoom_out", "pan_right"] as const;
const promptSchema = z.object({
  prompt: z.string().trim().min(1).max(1000).optional(),
});

class InsufficientCreditsError extends Error {}

type RouteContext = {
  params: Promise<{ id: string; sceneId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const caller = await resolveCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, sceneId } = await params;
  const parsed = promptSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const scene = await prisma.musicVideoScene.findFirst({
    where: {
      id: sceneId,
      musicVideoId: id,
      musicVideo: {
        orgId: caller.orgId,
        deletedAt: null,
        status: "DRAFT",
      },
    },
    include: { musicVideo: { select: { aspectRatio: true } } },
  });
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  const prompt =
    parsed.data.prompt ??
    scene.visualPrompt ??
    (scene.lyricsText
      ? `Cinematic still frame for a music video, inspired by these lyrics: ${scene.lyricsText}`
      : null);
  if (!prompt) {
    return NextResponse.json(
      { error: "No prompt available for this scene" },
      { status: 400 },
    );
  }

  try {
    await assertActiveSubscription(caller.orgId);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "An active subscription is required" },
        { status: 403 },
      );
    }
    Sentry.logger.error("Still generation subscription check failed", {
      orgId: caller.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not verify subscription" },
      { status: 500 },
    );
  }

  const rail = await pricingRailForOrg(caller.orgId);
  const size =
    SCENE_SIZES[scene.musicVideo.aspectRatio as keyof typeof SCENE_SIZES] ??
    SCENE_SIZES["16:9"];
  const quote = quoteImage(1, rail, size.width, size.height);
  const priorStatus = scene.status;
  let generationId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.musicVideoScene.updateMany({
        where: { id: scene.id, status: { not: "PENDING" } },
        data: { status: "PENDING" },
      });
      if (claimed.count === 0) return null;

      if (rail === "momo") {
        const reserved = await tx.momoCredits.updateMany({
          where: {
            orgId: caller.orgId,
            topUpBalanceUgx: { gte: quote.priceUgx },
          },
          data: { topUpBalanceUgx: { decrement: quote.priceUgx } },
        });
        if (reserved.count === 0) throw new InsufficientCreditsError();
      }

      return tx.imageGeneration.create({
        data: {
          orgId: caller.orgId,
          platformUserId: caller.platformUserId,
          prompt,
          width: size.width,
          height: size.height,
          status: "PENDING",
          sourceApp: "studio",
          sourceEntityId: scene.id,
          costMicroUsd: quote.costMicroUsd,
          costUgx: quote.costUgx,
          priceUgx: quote.priceUgx,
          priceUsdCents: quote.priceUsdCents,
          pricingRail: rail,
        },
        select: { id: true },
      });
    });
    if (!result) {
      return NextResponse.json(
        { error: "A visual is already generating for this scene" },
        { status: 409 },
      );
    }
    generationId = result.id;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient MoMo top-up balance", priceUgx: quote.priceUgx },
        { status: 402 },
      );
    }
    throw error;
  }

  let assetId: string | undefined;
  let objectKey: string | undefined;
  try {
    const { url } = await generateStill({ prompt, ...size });
    await prisma.imageGeneration.update({
      where: { id: generationId },
      data: { outputUrl: url, status: "PROCESSING" },
    });
    const asset = await assetFromImageGeneration(caller.orgId, generationId);
    assetId = asset.id;
    objectKey = asset.r2ObjectKey;
    const assetUrl = await signedUrl(asset.r2ObjectKey);

    const completed = await prisma.$transaction(async (tx) => {
      const generation = await tx.imageGeneration.updateMany({
        where: { id: generationId, status: "PROCESSING" },
        data: { status: "COMPLETED", errorMessage: null },
      });
      if (generation.count === 0) {
        throw new Error("Image generation is no longer completable");
      }
      await tx.usageRecord.create({
        data: {
          orgId: caller.orgId,
          month: new Date().getUTCMonth() + 1,
          year: new Date().getUTCFullYear(),
          imageGenerationId: generationId,
          imagesUsed: 1,
          costMicroUsd: quote.costMicroUsd,
          chargedUgx: rail === "momo" ? quote.priceUgx : null,
        },
      });
      const updated = await tx.musicVideoScene.updateMany({
        where: { id: scene.id, status: "PENDING" },
        data: {
          assetId: asset.id,
          source: "AI_IMAGE",
          clipGenerationId: null,
          status: "COMPLETED",
          motion: scene.motion ?? MOTIONS[scene.position % MOTIONS.length],
          visualPrompt: scene.visualPrompt ?? prompt,
        },
      });
      if (updated.count === 0) {
        throw new Error("Scene is no longer available for this image");
      }
      return true;
    });

    if (!completed) throw new Error("Image generation did not complete");
    return NextResponse.json({
      sceneId: scene.id,
      assetId: asset.id,
      assetUrl,
      priceUgx: rail === "momo" ? quote.priceUgx : undefined,
      priceUsd: quote.priceUsd,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed";
    try {
      const markedFailed = await prisma.$transaction(async (tx) => {
        const failed = await tx.imageGeneration.updateMany({
          where: {
            id: generationId,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          data: { status: "FAILED", errorMessage: message.slice(0, 500) },
        });
        if (failed.count === 0) return false;

        if (rail === "momo") {
          const refund = await tx.momoCredits.updateMany({
            where: { orgId: caller.orgId },
            data: { topUpBalanceUgx: { increment: quote.priceUgx } },
          });
          if (refund.count === 0) {
            throw new Error("Could not refund reserved image credits");
          }
        }
        await tx.musicVideoScene.updateMany({
          where: { id: scene.id, status: "PENDING" },
          data: { status: priorStatus },
        });
        return true;
      });
      if (markedFailed && assetId && objectKey) {
        await prisma.mediaAsset.deleteMany({
          where: { id: assetId, imageGenerationId: generationId },
        });
        await deleteObject(objectKey);
      }
    } catch (cleanupError) {
      Sentry.logger.error("Failed to clean up failed scene still generation", {
        generationId,
        sceneId: scene.id,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }
    Sentry.logger.error("Scene still generation failed", {
      generationId,
      sceneId: scene.id,
      error: message,
    });
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 502 },
    );
  }
}
