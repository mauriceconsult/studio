import * as Sentry from "@sentry/nextjs";
import {
  AssetKind,
  AssetOrigin,
  OutputFormat,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";

const OUTPUT_CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.MP3_44100]: "audio/mpeg",
  [OutputFormat.WAV]: "audio/wav",
  [OutputFormat.PCM_16000]: "audio/pcm",
  [OutputFormat.FLAC]: "audio/flac",
};

const OUTPUT_EXTENSIONS: Record<OutputFormat, string> = {
  [OutputFormat.MP3_44100]: "mp3",
  [OutputFormat.WAV]: "wav",
  [OutputFormat.PCM_16000]: "pcm",
  [OutputFormat.FLAC]: "flac",
};

interface CompleteSongGenerationInput {
  generationId: string;
  audio: Buffer;
  durationSeconds: number;
  outputFormat?: OutputFormat;
}

export async function completeSongGeneration({
  generationId,
  audio,
  durationSeconds,
  outputFormat,
}: CompleteSongGenerationInput) {
  if (audio.length === 0) {
    throw new Error("Cannot complete a song generation with empty audio");
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError("Song duration must be a finite, positive number");
  }

  const generation = await prisma.songGeneration.findUnique({
    where: { id: generationId },
    select: {
      id: true,
      orgId: true,
      platformUserId: true,
      outputFormat: true,
      costMicroUsd: true,
      priceUgx: true,
      pricingRail: true,
    },
  });

  if (!generation) {
    throw new Error(`Song generation ${generationId} was not found`);
  }

  const format = outputFormat ?? generation.outputFormat;
  const r2ObjectKey = `songs/orgs/${generation.orgId}/${generation.id}.${OUTPUT_EXTENSIONS[format]}`;
  const mimeType = OUTPUT_CONTENT_TYPES[format];
  const fileSize = audio.byteLength;
  const durationMs = Math.round(durationSeconds * 1000);

  try {
    await uploadAudio({ buffer: audio, key: r2ObjectKey, contentType: mimeType });

    return await prisma.$transaction(async (transaction) => {
      await transaction.songGeneration.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          outputFormat: format,
          r2ObjectKey,
          durationSeconds,
          fileSize,
          errorMessage: null,
        },
      });

      const asset = await transaction.mediaAsset.upsert({
        where: { songGenerationId: generation.id },
        create: {
          orgId: generation.orgId,
          platformUserId: generation.platformUserId,
          kind: AssetKind.AUDIO,
          origin: AssetOrigin.AI_GENERATED,
          name: "Generated song",
          r2ObjectKey,
          mimeType,
          fileSize,
          durationMs,
          songGenerationId: generation.id,
        },
        update: {
          platformUserId: generation.platformUserId,
          kind: AssetKind.AUDIO,
          origin: AssetOrigin.AI_GENERATED,
          name: "Generated song",
          r2ObjectKey,
          mimeType,
          fileSize,
          durationMs,
          deletedAt: null,
        },
      });

      const now = new Date();
      await transaction.usageRecord.upsert({
        where: { songGenerationId: generation.id },
        create: {
          orgId: generation.orgId,
          month: now.getUTCMonth() + 1,
          year: now.getUTCFullYear(),
          songGenerationId: generation.id,
          audioSecondsUsed: Math.ceil(durationSeconds),
          costMicroUsd: generation.costMicroUsd,
          chargedUgx:
            generation.pricingRail === "momo" ? generation.priceUgx : null,
        },
        update: {
          audioSecondsUsed: Math.ceil(durationSeconds),
          costMicroUsd: generation.costMicroUsd,
          chargedUgx:
            generation.pricingRail === "momo" ? generation.priceUgx : null,
        },
      });

      return asset;
    });
  } catch (error) {
    Sentry.logger.error("Failed to store completed song generation", {
      generationId: generation.id,
      orgId: generation.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function failSongGeneration(
  generationId: string,
  message: string,
) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.songGeneration.updateMany({
      where: {
        id: generationId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { status: "FAILED", errorMessage: message.slice(0, 500) },
    });
    if (result.count === 0) return;

    const generation = await tx.songGeneration.findUnique({
      where: { id: generationId },
      select: { orgId: true, priceUgx: true, pricingRail: true },
    });
    if (!generation) {
      throw new Error(`Song generation ${generationId} was not found`);
    }
    if (generation.pricingRail === "momo" && generation.priceUgx !== null) {
      const refunded = await tx.momoCredits.updateMany({
        where: { orgId: generation.orgId },
        data: { topUpBalanceUgx: { increment: generation.priceUgx } },
      });
      if (refunded.count === 0) {
        throw new Error("Could not refund the reserved song credits");
      }
    }
  });
}
