"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useQueryState, parseAsString } from "nuqs";

export function VideosView() {
  const trpc = useTRPC();
  const router = useRouter();
  const [query] = useQueryState("query", parseAsString.withDefault(""));

  const { data: videos, isLoading } = useQuery(
    trpc.videos.getAll.queryOptions({ query: query || undefined })
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Videos" />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && videos?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No videos yet. Generate one from the dashboard.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos?.map((video) => (
          <button
            key={video.id}
            onClick={() => router.push(`/videos/${video.id}`)}
            className="text-left border border-border rounded-xl p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm font-medium text-foreground truncate mb-1">
              {video.title}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {video.status}
              {video.durationSeconds ? ` · ${video.durationSeconds}s` : ""}
              {" · "}
              {new Date(video.createdAt).toLocaleDateString()}
            </p>
            {(video.status === "processing" || video.status === "pending") && (
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
