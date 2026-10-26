import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl } from "@/lib/r2";
import { finalizeSong } from "@/lib/songs/finalize";
import { queueStatus } from "@/lib/songs/provider";
import { failSongGeneration } from "@/lib/song-generation-output";

export const maxDuration = 60;
const GIVE_UP_MS = 15 * 60_000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;

  let song = await prisma.songGeneration.findFirst({
    where: { id, orgId, deletedAt: null },
  });
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (song.status === "PENDING" || song.status === "PROCESSING") &&
    song.providerJobId
  ) {
    try {
      const status = await queueStatus(song.providerJobId);
      if (status.status === "COMPLETED") {
        await finalizeSong(song.id, song.providerJobId);
        song = await prisma.songGeneration.findUniqueOrThrow({
          where: { id: song.id },
        });
      }
    } catch (error) {
      Sentry.logger.warn("Fal song status check failed", {
        generationId: song.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (
    (song.status === "PENDING" || song.status === "PROCESSING") &&
    Date.now() - song.createdAt.getTime() > GIVE_UP_MS
  ) {
    await failSongGeneration(song.id, "Song generation timed out");
    song = await prisma.songGeneration.findUniqueOrThrow({
      where: { id: song.id },
    });
  }

  return NextResponse.json({
    id: song.id,
    status: song.status,
    errorMessage: song.errorMessage,
    durationSeconds: song.durationSeconds,
    voiceName: song.voiceName,
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
    audioUrl:
      song.status === "COMPLETED" && song.r2ObjectKey
        ? await getSignedAudioUrl(song.r2ObjectKey)
        : null,
  });
}
