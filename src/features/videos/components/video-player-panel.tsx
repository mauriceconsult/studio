"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Video = inferRouterOutputs<AppRouter>["videos"]["getById"];

export function VideoPlayerPanel({ video }: { video: Video }) {
  const isActive = video.status === "pending" || video.status === "processing";

  if (isActive) {
    return (
      <div className="hidden border-t lg:flex items-center justify-center gap-3 p-6">
        <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>Rendering video… {video.progress}%</span>
        </Badge>
      </div>
    );
  }

  if (video.status !== "done" || !video.outputUrl) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = video.outputUrl!;
    a.download = `${video.title.replace(/\s+/g, "-").toLowerCase()}.mp4`;
    a.click();
  };

  return (
    <div className="hidden border-t lg:flex flex-col gap-0">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <p className="text-sm font-medium">Video preview</p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" />Download
        </Button>
      </div>
      <div className="px-4 pb-4 lg:px-6">
        <video
          src={video.outputUrl}
          controls
          autoPlay
          className="w-full rounded-xl border border-border"
        />
        {video.durationSeconds && (
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Duration: {video.durationSeconds}s
          </p>
        )}
      </div>
    </div>
  );
}
