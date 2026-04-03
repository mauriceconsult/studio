"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "done" | "processing" | "error" | "draft";

interface RecentJob {
  id: string;
  name: string;
  type: "speech" | "voice-clone" | "course" | "video" | "draft";
  status: JobStatus;
  progress?: number;
  result?: string;
  createdAt: string;
}

const TYPE_META: Record<RecentJob["type"], { icon: string; accent: string }> = {
  speech:       { icon: "🔊", accent: "bg-emerald-50" },
  "voice-clone":{ icon: "🎙", accent: "bg-blue-50" },
  course:       { icon: "📚", accent: "bg-amber-50" },
  video:        { icon: "🎬", accent: "bg-pink-50" },
  draft:        { icon: "📝", accent: "bg-muted" },
};

const STATUS_STYLES: Record<JobStatus, string> = {
  done:       "bg-emerald-50 text-emerald-800",
  processing: "bg-amber-50 text-amber-800",
  error:      "bg-red-50 text-red-700",
  draft:      "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  done:       "Done",
  processing: "Processing",
  error:      "Error",
  draft:      "Draft",
};

// Replace with your real data-fetching hook or SWR/React Query call.
// Return [] until you wire up a real /api/jobs endpoint.
function useRecentJobs(): RecentJob[] {
  return [];
}

// Polls in-progress jobs and updates their status/progress in state.
function useJobPoller(
  jobs: RecentJob[],
  setJobs: React.Dispatch<React.SetStateAction<RecentJob[]>>
) {
  const pollKey = jobs.map((j) => j.id + j.status).join(",");

  useEffect(() => {
    const processing = jobs.filter((j) => j.status === "processing");
    if (processing.length === 0) return;

    const intervals = processing.map((job) =>
      setInterval(async () => {
        try {
          const res = await fetch(`/api/job-status?id=${job.id}`);

          // Non-2xx response — mark as error, stop polling
          if (!res.ok) {
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, status: "error" } : j))
            );
            return;
          }

          const data: Partial<RecentJob> | null = await res.json();

          // Null body — job not found, stop polling silently
          if (!data) return;

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: data.status ?? j.status,
                    progress: data.progress ?? j.progress,
                    result: data.result ?? j.result,
                  }
                : j
            )
          );
        } catch {
          // Network error — leave status unchanged, retry next tick
        }
      }, 2000)
    );

    return () => intervals.forEach(clearInterval);
  }, [pollKey]);
}

export function RecentJobsPanel() {
  const router = useRouter();
  const initial = useRecentJobs();
  const [jobs, setJobs] = useState<RecentJob[]>(initial);

  useJobPoller(jobs, setJobs);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Recent
        </p>
        <button
          onClick={() => router.push("/jobs")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {jobs.map((job, i) => {
          const meta = TYPE_META[job.type];
          return (
            <button
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors",
                i < jobs.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${meta.accent}`}
              >
                {meta.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {job.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {job.type.replace("-", " ")} · {job.createdAt}
                </p>
              </div>

              {/* Progress bar for in-flight jobs */}
              {job.status === "processing" && job.progress !== undefined && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-amber-700">{job.progress}%</span>
                </div>
              )}

              {/* Status pill */}
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[job.status]}`}
              >
                {STATUS_LABELS[job.status]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
