import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl } from "@/lib/r2";
import { assertActiveSubscription } from "@/lib/subscription-guard";
import { quoteSong, toPublicQuote } from "@/lib/pricing/quote";
import { failSongGeneration } from "@/lib/song-generation-output";
import {
  buildStylePrompt,
  createSongSchema,
  submitSong,
} from "@/lib/songs/provider";

class InsufficientSongCreditsError extends Error {}

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json(
      { error: "An organization is required" },
      { status: 403 },
    );
  }

  const songs = await prisma.songGeneration.findMany({
    where: { orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { outputAsset: { select: { id: true } } },
  });

  return NextResponse.json(
    await Promise.all(
      songs.map(async (song) => ({
        id: song.id,
        status: song.status,
        lyrics: song.lyrics,
        stylePrompt: song.stylePrompt,
        language: song.language,
        tempoBpm: song.tempoBpm,
        durationSeconds: song.durationSeconds,
        targetDurationSeconds: song.targetDurationSeconds,
        errorMessage: song.errorMessage,
        createdAt: song.createdAt,
        assetId: song.outputAsset?.id ?? null,
        audioUrl:
          song.status === "COMPLETED" && song.r2ObjectKey
            ? await getSignedAudioUrl(song.r2ObjectKey)
            : null,
        quote:
          song.priceUgx === null ||
          song.priceUsdCents === null ||
          song.pricingRail === null
            ? null
            : {
                priceUgx: song.priceUgx,
                priceUsd: song.priceUsdCents / 100,
                rail: song.pricingRail,
              },
      })),
    ),
  );
}

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json(
      { error: "An organization is required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSongSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    await assertActiveSubscription(orgId);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "An active subscription is required" },
        { status: 403 },
      );
    }
    Sentry.logger.error("Song subscription check failed", {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not verify subscription" },
      { status: 500 },
    );
  }

  let voice: { id: string; name: string; description: string | null } | null =
    null;
  if (input.voiceId) {
    voice = await prisma.voice.findFirst({
      where: {
        id: input.voiceId,
        deletedAt: null,
        OR: [{ orgId: null }, { orgId }],
      },
      select: { id: true, name: true, description: true },
    });
    if (!voice) {
      return NextResponse.json({ error: "Voice not found" }, { status: 400 });
    }
  }

  const vocalStyle = voice ? `${voice.description ?? voice.name} vocals` : null;
  const momo = await prisma.momoCredits.findUnique({
    where: { orgId },
    select: { orgId: true },
  });
  const pricingRail = momo ? "momo" : "polar";
  const quote = quoteSong(input.durationSeconds, pricingRail);
  let song;
  try {
    song = await prisma.$transaction(async (tx) => {
      if (pricingRail === "momo") {
        const debit = await tx.momoCredits.updateMany({
          where: { orgId, topUpBalanceUgx: { gte: quote.priceUgx } },
          data: { topUpBalanceUgx: { decrement: quote.priceUgx } },
        });
        if (debit.count === 0) throw new InsufficientSongCreditsError();
      }
      return tx.songGeneration.create({
        data: {
          orgId,
          platformUserId: userId,
          lyrics: input.lyrics,
          stylePrompt: input.stylePrompt ?? null,
          language: input.language,
          tempoBpm: input.tempoBpm ?? null,
          targetDurationSeconds: input.durationSeconds,
          voiceId: voice?.id ?? null,
          voiceName: voice?.name ?? null,
          vocalStyle,
          provider: "fal-ace-step",
          outputFormat: "FLAC",
          sourceApp: input.sourceApp,
          sourceEntityId: input.sourceEntityId ?? null,
          status: "PENDING",
          costMicroUsd: quote.costMicroUsd,
          costUgx: quote.costUgx,
          priceUgx: quote.priceUgx,
          priceUsdCents: quote.priceUsdCents,
          pricingRail,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof InsufficientSongCreditsError) {
      return NextResponse.json(
        { error: "Insufficient MoMo top-up balance", quote: toPublicQuote(quote) },
        { status: 402 },
      );
    }
    throw error;
  }

  let requestId: string;
  try {
    requestId = await submitSong({
      id: song.id,
      lyrics: input.lyrics,
      duration: input.durationSeconds,
      bpm: input.tempoBpm,
      language: input.language,
      prompt: buildStylePrompt({
        stylePrompt: input.stylePrompt,
        tempoBpm: input.tempoBpm,
        vocalStyle,
      }),
    });
  } catch (error) {
    Sentry.logger.error("Fal song submission failed", {
      generationId: song.id,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    await failSongGeneration(
      song.id,
      error instanceof Error ? error.message : "Fal submission failed",
    );
    return NextResponse.json(
      { error: "Could not start song generation" },
      { status: 502 },
    );
  }

  try {
    await prisma.songGeneration.update({
      where: { id: song.id },
      data: { providerJobId: requestId },
    });
  } catch (error) {
    Sentry.logger.error("Failed to save Fal song request id", {
      generationId: song.id,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Song generation was submitted but could not be saved" },
      { status: 500 },
    );
  }

  Sentry.logger.info("Fal song generation submitted", {
    generationId: song.id,
    orgId,
  });
  return NextResponse.json(
    { id: song.id, status: "PENDING", quote: toPublicQuote(quote) },
    { status: 202 },
  );
}
