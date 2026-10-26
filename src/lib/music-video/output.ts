import * as Sentry from "@sentry/nextjs";
import {
  AssetKind,
  AssetOrigin,
  SceneSource,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { uploadObject } from "@/lib/r2";

const VIDEO_CONTENT_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm",
} as const;

type VideoContentType = keyof typeof VIDEO_CONTENT_TYPES;

interface CompleteVideoClipInput {
  generationId: string;
  video: Buffer;
  mimeType: VideoContentType;
  durationSeconds: number;
  width?: number;
  height?: number;
  name?: string;
}

export async function completeVideoClipGeneration({
  generationId,
  video,
  mimeType,
  durationSeconds,
  width,
  height,
  name,
}: CompleteVideoClipInput) {
  if (video.length === 0) {
    throw new Error("Cannot complete a video clip generation with empty video");
  }
  if (!(mimeType in VIDEO_CONTENT_TYPES)) {
    throw new Error(`Unsupported video content type: ${mimeType}`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError("Video duration must be a finite, positive number");
  }
  if (width !== undefined && (!Number.isInteger(width) || width <= 0)) {
    throw new RangeError("Video width must be a positive integer");
  }
  if (height !== undefined && (!Number.isInteger(height) || height <= 0)) {
    throw new RangeError("Video height must be a positive integer");
  }

  const generation = await prisma.videoClipGeneration.findUnique({
    where: { id: generationId },
    select: {
      id: true,
      orgId: true,
      platformUserId: true,
      status: true,
      costMicroUsd: true,
      priceUgx: true,
      billingCostUgx: true,
      pricingRail: true,
    },
  });
  if (!generation) {
    throw new Error(`Video clip generation ${generationId} was not found`);
  }
  if (generation.status === "FAILED") {
    throw new Error(`Video clip generation ${generationId} has failed`);
  }
  if (generation.status === "COMPLETED") {
    const existing = await prisma.mediaAsset.findUnique({
      where: { videoClipGenerationId: generation.id },
    });
    if (existing) return existing;
  }

  const extension = VIDEO_CONTENT_TYPES[mimeType];
  const r2ObjectKey = `video-clips/orgs/${generation.orgId}/${generation.id}.${extension}`;
  const fileSize = video.byteLength;
  const durationMs = Math.round(durationSeconds * 1000);

  try {
    await uploadObject({ buffer: video, key: r2ObjectKey, contentType: mimeType });

    return await prisma.$transaction(async (tx) => {
      const won = await tx.videoClipGeneration.updateMany({
        where: {
          id: generation.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        data: { status: "COMPLETED", errorMessage: null },
      });
      if (won.count === 0) {
        const existing = await tx.mediaAsset.findUnique({
          where: { videoClipGenerationId: generation.id },
        });
        if (!existing) throw new Error("Clip is no longer completable");
        return existing;
      }

      const asset = await tx.mediaAsset.create({
        data: {
          orgId: generation.orgId,
          platformUserId: generation.platformUserId,
          kind: AssetKind.VIDEO,
          origin: AssetOrigin.AI_GENERATED,
          name: name ?? "Generated video clip",
          r2ObjectKey,
          mimeType,
          fileSize,
          durationMs,
          width,
          height,
          videoClipGenerationId: generation.id,
        },
      });

      const now = new Date();
      await tx.usageRecord.create({
        data: {
          orgId: generation.orgId,
          month: now.getUTCMonth() + 1,
          year: now.getUTCFullYear(),
          videoClipGenerationId: generation.id,
          videoSecondsUsed: Math.round(durationSeconds),
          costMicroUsd: generation.costMicroUsd,
          chargedUgx:
            generation.pricingRail === "momo"
              ? generation.priceUgx
              : generation.pricingRail === null
                ? generation.billingCostUgx
                : null,
        },
      });

      await tx.musicVideoScene.updateMany({
        where: {
          clipGenerationId: generation.id,
          source: SceneSource.AI_VIDEO,
          assetId: null,
          status: "PENDING",
          musicVideo: { is: { orgId: generation.orgId } },
        },
        data: {
          assetId: asset.id,
          status: "COMPLETED",
        },
      });

      return asset;
    });
  } catch (error) {
    Sentry.logger.error("Failed to finalize video clip asset", {
      generationId: generation.id,
      orgId: generation.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function failVideoClipGeneration(
  generationId: string,
  message: string,
) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.videoClipGeneration.updateMany({
      where: {
        id: generationId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { status: "FAILED", errorMessage: message.slice(0, 500) },
    });
    if (result.count === 0) return;

    const generation = await tx.videoClipGeneration.findUnique({
      where: { id: generationId },
      select: {
        orgId: true,
        billingCostUgx: true,
        priceUgx: true,
        pricingRail: true,
      },
    });
    if (!generation) {
      throw new Error(`Video clip generation ${generationId} was not found`);
    }
    const refundUgx =
      generation.pricingRail === "momo"
        ? generation.priceUgx
        : generation.pricingRail === null
          ? generation.billingCostUgx
          : null;
    if (refundUgx !== null) {
      const refunded = await tx.momoCredits.updateMany({
        where: { orgId: generation.orgId },
        data: {
          topUpBalanceUgx: { increment: refundUgx },
        },
      });
      if (refunded.count === 0) {
        throw new Error("Could not refund the reserved video clip credits");
      }
    }

    await tx.musicVideoScene.updateMany({
      where: {
        clipGenerationId: generationId,
        source: SceneSource.AI_VIDEO,
        assetId: null,
        status: "PENDING",
        musicVideo: { is: { orgId: generation.orgId } },
      },
      data: { status: "FAILED" },
    });
  });
}
