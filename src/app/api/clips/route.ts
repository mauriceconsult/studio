import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { resolveCaller } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";
import { signedUrl } from "@/lib/r2";
import { submitClip } from "@/lib/clips/provider";
import { clampClipSeconds } from "@/lib/clips/limits";
import { quoteClip, toPublicQuote } from "@/lib/pricing/quote";
import { failVideoClipGeneration } from "@/lib/music-video/output";
import { assertActiveSubscription } from "@/lib/subscription-guard";

const schema = z.object({
  sceneId: z.string(),
  prompt: z.string().trim().min(1).max(1000).optional(), // defaults to the scene's visualPrompt
  durationSeconds: z.number().int().min(3).max(10).optional(),
  resolution: z.enum(["480p", "580p", "720p"]).optional(),
  referenceAssetId: z.string().optional(), // set = image-to-video from a library image
});

class InsufficientClipCreditsError extends Error {}

export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: p.error.flatten() }, { status: 400 });

  const scene = await prisma.musicVideoScene.findFirst({
    where: {
      id: p.data.sceneId,
      musicVideo: { orgId: caller.orgId, deletedAt: null, status: "DRAFT" },
    },
    include: { musicVideo: { select: { aspectRatio: true } } },
  });
  if (!scene)
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });

  const durationSeconds =
    p.data.durationSeconds ??
    clampClipSeconds(scene.endMs - scene.startMs);
  const hasMomoCredits = Boolean(
    await prisma.momoCredits.findUnique({
      where: { orgId: caller.orgId },
      select: { orgId: true },
    }),
  );
  const pricingRail = hasMomoCredits ? "momo" : "polar";
  const resolution = p.data.resolution ?? env.CLIP_FAL_RESOLUTION;
  const quote = quoteClip(durationSeconds, resolution, pricingRail);
  const prompt = p.data.prompt ?? scene.visualPrompt;
  if (!prompt)
    return NextResponse.json(
      { error: "No prompt: set the scene's visualPrompt or pass one" },
      { status: 400 },
    );

  let imageUrl: string | undefined;
  if (p.data.referenceAssetId) {
    const ref = await getOwnedAsset(caller.orgId, p.data.referenceAssetId, [
      "IMAGE",
    ]);
    if (!ref)
      return NextResponse.json(
        { error: "Reference image not found" },
        { status: 400 },
      );
    imageUrl = await signedUrl(ref.r2ObjectKey);
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
    Sentry.logger.error("Video clip subscription check failed", {
      orgId: caller.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not verify subscription" },
      { status: 500 },
    );
  }

  // Claim the scene and create the clip together. The scene resets to "waiting" so a regenerate works.
  let clip;
  try {
    clip = await prisma.$transaction(async (tx) => {
      const claimed = await tx.musicVideoScene.updateMany({
        where: { id: scene.id, status: { not: "PENDING" } },
        data: { status: "PENDING", assetId: null, source: "AI_VIDEO" },
      });
      if (claimed.count === 0) return null;

      if (pricingRail === "momo") {
        const debit = await tx.momoCredits.updateMany({
          where: {
            orgId: caller.orgId,
            topUpBalanceUgx: { gte: quote.priceUgx },
          },
          data: { topUpBalanceUgx: { decrement: quote.priceUgx } },
        });
        if (debit.count === 0) throw new InsufficientClipCreditsError();
      }

      const created = await tx.videoClipGeneration.create({
        data: {
          orgId: caller.orgId,
          platformUserId: caller.platformUserId,
          prompt,
          referenceAssetId: p.data.referenceAssetId,
          aspectRatio: scene.musicVideo.aspectRatio,
          durationSeconds,
          provider: "pending",
          resolution,
          costMicroUsd: quote.costMicroUsd,
          costUgx: quote.costUgx,
          priceUgx: quote.priceUgx,
          priceUsdCents: quote.priceUsdCents,
          pricingRail,
        },
      });
      await tx.musicVideoScene.update({
        where: { id: scene.id },
        data: { clipGenerationId: created.id },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof InsufficientClipCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient MoMo top-up balance",
          quote: toPublicQuote(quote),
        },
        { status: 402 },
      );
    }
    throw error;
  }
  if (!clip)
    return NextResponse.json(
      { error: "A clip is already generating for this scene" },
      { status: 409 },
    );

  try {
    const { requestId, provider } = await submitClip({
      id: clip.id,
      prompt,
      durationSeconds: clip.durationSeconds,
      aspectRatio: clip.aspectRatio,
      resolution,
      imageUrl,
    });
    await prisma.videoClipGeneration.update({
      where: { id: clip.id },
      data: { providerJobId: requestId, provider },
    });
  } catch (error) {
    await failVideoClipGeneration(
      clip.id,
      error instanceof Error ? error.message : "Submit failed",
    );
    return NextResponse.json(
      { error: "Could not start generation" },
      { status: 502 },
    );
  }
  return NextResponse.json(
    {
      id: clip.id,
      sceneId: scene.id,
      status: "PENDING",
      quote: toPublicQuote(quote),
    },
    { status: 202 },
  );
}
