import { createJob, updateJob } from "@/lib/job";

export async function POST(req: Request) {
  const { script } = await req.json();

  const job = await createJob();

  // run async WITHOUT blocking response
  runJob(job.id, script);

  return Response.json({ jobId: job.id });
}

async function runJob(jobId: string, script: string) {
  
  void script; // acknowledged – reserved for future pipeline use
  try {
    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      await updateJob(jobId, { progress: i * 20 });
    }

    await updateJob(jobId, {
      status: "done",
      progress: 100,
      result: "/sample-video.mp4",
    });
  } catch {
    await updateJob(jobId, { status: "error" });
  }
}
