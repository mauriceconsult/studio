import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyClipToken } from "@/lib/clips/provider";
import { processClip } from "@/lib/clips/process";
import { failVideoClipGeneration } from "@/lib/music-video/output";
import { prisma } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 120; // video download + upload

const webhookSchema = z.object({
  status: z.enum(["OK", "ERROR"]),
  request_id: z.string().min(1),
  error: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!id || !verifyClipToken(id, t))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = webhookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
  const clip = await prisma.videoClipGeneration.findUnique({
    where: { id },
    select: { providerJobId: true },
  });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (clip.providerJobId && clip.providerJobId !== parsed.data.request_id) {
    return NextResponse.json({ error: "Mismatched request id" }, { status: 400 });
  }
  if (!clip.providerJobId) {
    await prisma.videoClipGeneration.updateMany({
      where: { id, providerJobId: null },
      data: { providerJobId: parsed.data.request_id },
    });
  }
  if (parsed.data.status === "ERROR") {
    await failVideoClipGeneration(id, parsed.data.error ?? "Provider error");
    return NextResponse.json({ ok: true });
  }
  try {
    await processClip(id, parsed.data.request_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.logger.error("Failed to process video clip webhook", {
      generationId: id,
      requestId: parsed.data.request_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "retry" }, { status: 500 }); // non-2xx makes fal retry
  }
}
