"use client";

import { useEffect, useState } from "react";

interface Job {
  id: string;
  status: string;
  progress: number;
  result?: string;
  error?: string;
}

export default function GenerationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch("/api/generations");
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }, 3000);

  return () => clearInterval(interval);
}, []);

  if (loading) {
    return <p className="p-8">Loading generations...</p>;
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Generations</h1>

      {jobs.length === 0 && (
        <p className="text-gray-500">No generations yet.</p>
      )}

      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="border rounded p-4 space-y-2">
            <p className="text-sm text-gray-500">ID: {job.id}</p>

            <p>Status: {job.status}</p>

            <div className="w-full bg-gray-200 rounded h-2">
              <div
                className="bg-black h-2 rounded"
                style={{ width: `${job.progress}%` }}
              />
            </div>

            {job.result && (
              <video src={job.result} controls className="w-full rounded" />
            )}

            {job.error && <p className="text-red-500 text-sm">{job.error}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
