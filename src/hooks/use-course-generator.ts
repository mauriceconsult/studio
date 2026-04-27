import { useState } from "react";

interface JobStatus {
  status: string;
  [key: string]: unknown;
}

export function useCourseGenerator() {
  const [job, setJob] = useState<JobStatus | null>(null);

  async function generate(script: string) {
    const res = await fetch("/api/generate-course", {
      method: "POST",
      body: JSON.stringify({ script }),
    });

    const { jobId } = await res.json();

    poll(jobId);
  }

  function poll(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/job-status?id=${jobId}`);
      const data = await res.json();

      setJob(data);

      if (data.status === "done" || data.status === "error") {
        clearInterval(interval);
      }
    }, 2000);
  }

  return { generate, job };
}
