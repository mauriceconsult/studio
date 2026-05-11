"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  useMemo
  // , useRef
} from "react";
import { useRouter } from "next/navigation";

type JobStatus = "done" | "processing" | "pending" | "error";

const MODULE_NOW = Date.now();
const STATUS_STYLES: Record<JobStatus, string> = {
  done: "bg-emerald-50 text-emerald-800",
  processing: "bg-amber-50 text-amber-800",
  pending: "bg-amber-50 text-amber-800",
  error: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  done: "Done",
  processing: "Processing",
  pending: "Pending",
  error: "Error",
};

const TYPE_META = {
  course: { icon: "📚", accent: "bg-amber-50" },
  video: { icon: "🎬", accent: "bg-pink-50" },
  audio: { icon: "🎵", accent: "bg-blue-50" },
  text: { icon: "📝", accent: "bg-green-50" },
  image: { icon: "🖼️", accent: "bg-purple-50" },
};

const TYPE_HREF: Record<string, string> = {
  course: "courses",
  video: "videos",
  audio: "voices",
  text: "text-generations",
  image: "image-generations",
};

interface JobRow {
  id: string;
  title: string;
  type: keyof typeof TYPE_META;
  status: JobStatus;
  progress: number;
  createdAt: Date;
}

function formatDate(date: Date, now: number): string {
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return date.toLocaleDateString();
}

export function RecentJobsPanel() {
  const trpc = useTRPC();
  const router = useRouter();

  const { data: courses } = useQuery(trpc.courses.getAll.queryOptions({}));
  const { data: videos } = useQuery(trpc.videos.getAll.queryOptions({}));
  const { data: audios } = useQuery(trpc.voices.getAll.queryOptions({}));
  const { data: texts } = useQuery(trpc.textGenerations.getAll.queryOptions());
const { data: images } = useQuery(
  trpc.imageGenerations.getAll.queryOptions({}),
);

  const jobs = useMemo<JobRow[]>(() => {
    const flatAudios =
      audios && !Array.isArray(audios)
        ? [...(audios.custom ?? []), ...(audios.system ?? [])]
        : [];

    return [
      ...(courses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        type: "course" as const,
        status: c.status as JobStatus,
        progress: c.progress,
        createdAt: new Date(c.createdAt),
      })),
      ...(videos ?? []).map((v) => ({
        id: v.id,
        title: v.title,
        type: "video" as const,
        status: v.status as JobStatus,
        progress: v.progress,
        createdAt: new Date(v.createdAt),
      })),
      ...flatAudios.map((a) => ({
        id: a.id,
        title: a.name,
        type: "audio" as const,
        status: "done" as JobStatus,
        progress: 0,
        createdAt: new Date(MODULE_NOW),
      })),
      ...(texts ?? []).map((t) => ({
        id: t.id,
        title: t.prompt,
        type: "text" as const,
        status: t.status.toLowerCase() as JobStatus,
        progress: 0,
        createdAt: new Date(t.createdAt),
      })),
      ...(images ?? []).map((img) => ({
        id: img.id,
        title: img.prompt,
        type: "image" as const,
        status: img.status.toLowerCase() as JobStatus,
        progress: 0,
        createdAt: new Date(img.createdAt),
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8);
  }, [courses, videos, audios, texts, images]);

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Recent
        </p>
        <button
          onClick={() => router.push("/courses")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {jobs.map((job, i) => {
          const meta = TYPE_META[job.type];
          const href = `/${TYPE_HREF[job.type]}/${job.id}`;

          return (
            <button
              key={job.id}
              onClick={() => router.push(href)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors",
                i < jobs.length - 1 ? "border-b border-border" : "",
              ].join(" ")}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${meta.accent}`}
              >
                {meta.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {job.title}
                </p>
                {/* ✅ Fix 4: pass `now` to formatDate */}
                <p className="text-xs text-muted-foreground capitalize">
                  {job.type} · {formatDate(job.createdAt, MODULE_NOW)}
                </p>
              </div>

              {(job.status === "processing" || job.status === "pending") &&
                job.progress > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-700">
                      {job.progress}%
                    </span>
                  </div>
                )}

              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[job.status]}`}
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