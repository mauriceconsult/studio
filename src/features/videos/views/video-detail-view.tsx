"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { VideoScriptPanel } from "../components/video-script-panel";
import { VideoPlayerPanel } from "../components/video-player-panel";
import { VideoSettingsPanel } from "../components/video-settings-panel";

export function VideoDetailView({ videoId }: { videoId: string }) {
  const trpc = useTRPC();
  const { data: video } = useSuspenseQuery(
    trpc.videos.getById.queryOptions({ id: videoId })
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left — script input + video player */}
      <div className="flex min-h-0 flex-1 flex-col">
        <VideoScriptPanel video={video} />
        <VideoPlayerPanel video={video} />
      </div>
      {/* Right — settings + history */}
      <VideoSettingsPanel video={video} />
    </div>
  );
}
