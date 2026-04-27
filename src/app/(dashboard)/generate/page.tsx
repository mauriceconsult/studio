"use client";
import { useState } from "react";

interface Job {
  status: string;
  progress: number;
  result?: string;
}

export default function GeneratePage() {
  const [script, setScript] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setJob(null);

    const res = await fetch("/api/generate-course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script }),
    });

    const { jobId } = await res.json();
    // setJobId(jobId);
    poll(jobId);
  }

  function poll(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/job-status?id=${id}`);
      const data = await res.json();

      setJob(data);

      if (data.status === "done" || data.status === "error") {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-4">
      <textarea
        className="w-full border rounded p-3 h-40 text-sm"
        placeholder="Paste your tutorial script…"
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !script}
        className="bg-black text-white px-5 py-2 rounded disabled:opacity-40"
      >
        {loading ? "Generating…" : "Generate tutorial"}
      </button>

      {job && (
        <div className="mt-4 space-y-2">
          <p>Status: {job.status}</p>
          <p>Progress: {job.progress}%</p>

          {job.status === "processing" && (
            <div className="w-full bg-gray-200 rounded h-2">
              <div
                className="bg-black h-2 rounded"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}

          {job.result && (
            <video src={job.result} controls className="w-full rounded mt-4" />
          )}
        </div>
      )}
    </main>
  );
}
