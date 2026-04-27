"use client";

import { Clapperboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type VideoItem = inferRouterOutputs<AppRouter>["videos"]["getAll"][number];

const STATUS_STYLES = {
  pending:    "bg-muted text-muted-foreground",
  processing: "bg-amber-50 text-amber-800",
  done:       "bg-emerald-50 text-emerald-800",
  error:      "bg-red-50 text-red-700",
} as const;

function VideoCard({ video }: { video: VideoItem }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/videos/${video.id}`)}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {video.title}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[video.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.pending}`}>
          {video.status}
        </span>
      </div>
      {(video.status === "processing" || video.status === "pending") && (
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${video.progress}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {video.durationSeconds && <span>{video.durationSeconds}s</span>}
        <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
      </div>
    </button>
  );
}

export function VideosList({ videos }: { videos: VideoItem[] }) {
  if (!videos.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="rounded-full bg-muted p-4">
          <Clapperboard className="size-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold tracking-tight">No videos yet</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Generate your first video from the dashboard. Paste a script and choose Video mode.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
