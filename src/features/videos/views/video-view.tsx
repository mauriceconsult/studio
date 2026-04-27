"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";

interface VideoViewProps {
  videoId: string;
}

export function VideoView({ videoId }: VideoViewProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dispatchedRef = useRef(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const { data: video, refetch } = useQuery(
    trpc.videos.getById.queryOptions({ id: videoId })
  );

  // Dispatch to INSTASKUL once on mount if still pending
  useEffect(() => {
    if (!video || dispatchedRef.current) return;
    if (video.status !== "pending") return;

    dispatchedRef.current = true;

    fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
      .then((res) => {
        if (!res.ok) setDispatchError("Failed to start render. Please try again.");
        else refetch();
      })
      .catch(() => setDispatchError("Network error. Please try again."));
  }, [video?.status]);

  // Poll while processing
  useEffect(() => {
    if (!video) return;
    if (video.status === "processing" || video.status === "pending") {
      intervalRef.current = setInterval(() => refetch(), 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [video?.status]);

  if (!video) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-4xl">
      <button
        onClick={() => router.push("/videos")}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        Back to Videos
      </button>

      <PageHeader title={video.title} />

      <div className="flex items-center gap-2">
        <span
          className={[
            "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
            video.status === "done"
              ? "bg-emerald-50 text-emerald-800"
              : video.status === "processing" || video.status === "pending"
              ? "bg-amber-50 text-amber-800"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {video.status}
        </span>
        {video.durationSeconds && (
          <span className="text-xs text-muted-foreground">
            {video.durationSeconds}s
          </span>
        )}
      </div>

      {(video.status === "processing" || video.status === "pending") && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden max-w-sm">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${video.progress}%` }}
          />
        </div>
      )}

      {dispatchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{dispatchError}</p>
        </div>
      )}

      {video.status === "done" && video.outputUrl && (
        <video
          src={video.outputUrl}
          controls
          className="w-full max-w-3xl rounded-xl border border-border"
        />
      )}

      {video.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {video.errorMessage ?? "An error occurred during rendering."}
          </p>
        </div>
      )}
    </div>
  );
}
