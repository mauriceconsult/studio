// src/app/api/generate-video/route.ts
// Expects the video record to already exist (created by trpc.videos.create).
// Updates externalJobId once INSTASKUL accepts the job.

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await req.json();

  const video = await prisma.video.findFirst({
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

  // Read body once, attempt JSON parse regardless of status
  const rawText = await res.text();
  let payload: { jobId?: string } = {};
  try {
    payload = JSON.parse(rawText);
  } catch {
    // INSTASKUL returned HTML — log it so you can see what's happening
    console.error(
      "INSTASKUL non-JSON response:",
      res.status,
      rawText.slice(0, 300),
    );
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: "error",
        errorMessage: `Render service error: ${res.status}`,
      },
    });
    return Response.json(
      { error: "Render service returned invalid response", status: res.status },
      { status: 502 },
    );
  }

  if (!res.ok || !payload.jobId) {
    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: "error",
        errorMessage: payload?.jobId ?? "Dispatch failed",
      },
    });
    return Response.json({ error: "Dispatch failed" }, { status: 502 });
  }

  await prisma.video.update({
    where: { id: video.id },
    data: { status: "processing", externalJobId: payload.jobId },
  });

  return Response.json({ videoId: video.id, jobId: payload.jobId });
}
