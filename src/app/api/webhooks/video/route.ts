// src/app/api/webhooks/video/route.ts
// INSTASKUL_URL posts status updates here as a video renders.
// Secure this endpoint by validating the shared secret in env.ts.

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NextRequest } from "next/server";

interface VideoWebhookPayload {
  jobId: string;       // matches Video.externalJobId
  status: "processing" | "done" | "error";
  progress: number;
  outputUrl?: string;
  durationSeconds?: number;
  errorMessage?: string;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== env.INSTASKUL_URL) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: VideoWebhookPayload = await req.json();

  const video = await db.video.findFirst({
    where: { externalJobId: body.jobId },
  });

  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  await db.video.update({
    where: { id: video.id },
    data: {
      status:          body.status,
      progress:        body.progress,
      outputUrl:       body.outputUrl ?? null,
      durationSeconds: body.durationSeconds ?? null,
      errorMessage:    body.errorMessage ?? null,
    },
  });

  return Response.json({ ok: true });
}
