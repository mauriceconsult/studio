import { prisma } from "@/lib/db";

// app/api/internal/resume-job/route.ts
export async function POST(req: Request) {
  const { jobId } = await req.json();
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "queued" },
  });
  return Response.json({ ok: true });
}
