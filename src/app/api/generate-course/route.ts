// src/app/api/generate-course/route.ts
// Replaces the original stateless GeneratePage API call.
// Expects the course record to already exist (created by trpc.courses.create).
// Updates externalJobId once PLATFORM_API accepts the job.

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await req.json();

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId: orgId },
  });

  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  // Dispatch to external platform
  const res = await fetch(`${env.PLATFORM_API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PLATFORM_API_KEY}`,
    },
    body: JSON.stringify({ script: course.script }),
  });

  if (!res.ok) {
    await prisma.course.update({
      where: { id: course.id },
      data: { status: "error", errorMessage: "Failed to dispatch job" },
    });
    return Response.json({ error: "Dispatch failed" }, { status: 502 });
  }

  const { jobId } = await res.json();

  await prisma.course.update({
    where: { id: course.id },
    data: { status: "processing", externalJobId: jobId },
  });

  return Response.json({ courseId: course.id, jobId });
}
