import * as Sentry from "@sentry/nextjs";
import { parseBuffer } from "music-metadata";
import { OutputFormat } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { completeSongGeneration } from "@/lib/song-generation-output";
import { fetchSongResult } from "./provider";

const FORMATS: Record<string, OutputFormat> = {
  "audio/flac": OutputFormat.FLAC,
  "audio/x-flac": OutputFormat.FLAC,
  "audio/wav": OutputFormat.WAV,
  "audio/x-wav": OutputFormat.WAV,
  "audio/mpeg": OutputFormat.MP3_44100,
};

const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

async function readAudioResponse(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES) {
    throw new Error("Fal audio output exceeds the 100 MB limit");
  }

  if (!response.body) throw new Error("Fal audio response has no body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error("Fal audio output exceeds the 100 MB limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function finalizeSong(id: string, requestId?: string) {
  const claim = await prisma.songGeneration.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
  if (claim.count === 0) return;

  try {
    const song = await prisma.songGeneration.findUniqueOrThrow({
      where: { id },
    });
    const jobId = song.providerJobId ?? requestId;
    if (!jobId) throw new Error("No provider job id");
    if (song.providerJobId && requestId && song.providerJobId !== requestId) {
      throw new Error("Fal webhook request id does not match the song job");
    }

    const { url, durationSeconds } = await fetchSongResult(jobId);
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Audio download failed: ${res.status}`);
    const type = (res.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const format = FORMATS[type];
    if (!format) throw new Error(`Unsupported Fal audio content type: ${type}`);
    const buffer = await readAudioResponse(res);
    const metadata = await parseBuffer(buffer, { mimeType: type });
    const seconds =
      metadata.format.duration ??
      durationSeconds ??
      song.targetDurationSeconds;
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
      throw new Error("Could not determine the generated audio duration");
    }

    await prisma.songGeneration.update({
      where: { id },
      data: { providerJobId: jobId },
    });
    await completeSongGeneration({
      generationId: song.id,
      audio: buffer,
      durationSeconds: seconds,
      outputFormat: format,
    });
  } catch (error) {
    await prisma.songGeneration.update({
      where: { id },
      data: {
        status: "PENDING",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 500) : "Finalization failed",
      },
    });
    Sentry.logger.error("Song finalization failed", {
      generationId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
