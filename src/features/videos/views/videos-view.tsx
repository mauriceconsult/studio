"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/client";
import { VideosToolbar } from "../components/videos-toolbar";
import { VideosList } from "../components/videos-list";
import { videosSearchParams } from "../lib/params";

function VideosContent() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", videosSearchParams.query);
  const { data: videos } = useSuspenseQuery(
    trpc.videos.getAll.queryOptions({ query: query || undefined })
  );

  return <VideosList videos={videos} />;
}

export function VideosView() {
  return (
    <div className="flex-1 space-y-10 overflow-y-auto p-3 lg:p-6">
      <VideosToolbar />
      <VideosContent />
    </div>
  );
}
