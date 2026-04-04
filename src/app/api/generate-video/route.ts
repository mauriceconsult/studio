// src/app/api/generate-video/route.ts
// Expects the video record to already exist (created by trpc.videos.create).
// Updates externalJobId once INSTASKUL accepts the job.

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await req.json();

  const video = await db.video.findFirst({
    where: { id: videoId, organizationId: orgId },
  });

  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  // Dispatch to INSTASKUL
  const res = await fetch(`${env.INSTASKUL_URL}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PLATFORM_API_KEY}`,
    },
    body: JSON.stringify({ script: video.script }),
  });

  if (!res.ok) {
    await db.video.update({
      where: { id: video.id },
      data: { status: "error", errorMessage: "Failed to dispatch render job" },
    });
    return Response.json({ error: "Dispatch failed" }, { status: 502 });
  }

  const { jobId } = await res.json();

  await db.video.update({
    where: { id: video.id },
    data: { status: "processing", externalJobId: jobId },
  });

  return Response.json({ videoId: video.id, jobId });
}
