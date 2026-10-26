import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeSong } from "@/lib/songs/finalize";
import { verifyWebhookToken } from "@/lib/songs/provider";
import { failSongGeneration } from "@/lib/song-generation-output";

export const maxDuration = 60;

const webhookSchema = z.object({
  request_id: z.string().min(1),
  status: z.enum(["OK", "ERROR"]),
  error: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!verifyWebhookToken(id, token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Fal webhook payload" },
      { status: 400 },
    );
  }

  const song = await prisma.songGeneration.findUnique({
    where: { id },
    select: { id: true, providerJobId: true, status: true },
  });
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  if (song.providerJobId && song.providerJobId !== parsed.data.request_id) {
    return NextResponse.json({ error: "Request id mismatch" }, { status: 409 });
  }
  if (song.status === "COMPLETED" || song.status === "FAILED") {
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.status === "ERROR") {
    const errorMessage =
      typeof parsed.data.error === "string"
        ? parsed.data.error.slice(0, 500)
        : "Fal song generation failed";
    await prisma.songGeneration.updateMany({
      where: { id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { providerJobId: parsed.data.request_id },
    });
    await failSongGeneration(id, errorMessage);
    Sentry.logger.error("Fal song generation failed", {
      generationId: id,
      error: errorMessage,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await finalizeSong(id, parsed.data.request_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.logger.error("Fal song webhook finalization failed", {
      generationId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Retry finalization" }, { status: 500 });
  }
}
