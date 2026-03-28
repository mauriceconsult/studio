import { prisma } from "@/lib/db";

export async function createJob() {
  return prisma.job.create({
    data: {
      status: "processing",
      progress: 0,
    },
  });
}

export async function getJob(id: string) {
  return prisma.job.findUnique({
    where: { id },
  });
}

export async function getAllJobs() {
  return prisma.job.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function updateJob(
  id: string,
  data: { status?: string; progress?: number; result?: string },
) {
  return prisma.job.update({
    where: { id },
    data,
  });
}
