// src/app/api/webhooks/course/route.ts
// PLATFORM_API_URL posts status updates here as a job progresses.
// Secure this endpoint by validating the shared secret in env.ts.

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { NextRequest } from "next/server";

interface CourseWebhookPayload {
  jobId: string;       // matches Course.externalJobId
  status: "processing" | "done" | "error";
  progress: number;
  result?: unknown;
  errorMessage?: string;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== env.PLATFORM_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CourseWebhookPayload = await req.json();

  const course = await prisma.course.findFirst({
    where: { externalJobId: body.jobId },
  });

  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  await prisma.course.update({
    where: { id: course.id },
    data: {
      status:       body.status,
      progress:     body.progress,
      result:       body.result ?? undefined,
      errorMessage: body.errorMessage ?? null,
    },
  });

  return Response.json({ ok: true });
}
