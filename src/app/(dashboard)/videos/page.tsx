import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { VideosView } from "@/features/videos/views/videos-view";
import { videosSearchParamsCache } from "@/features/videos/lib/params";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { query } = await videosSearchParamsCache.parse(searchParams);

  prefetch(trpc.videos.getAll.queryOptions({ query }));

  return (
    <HydrateClient>
      <VideosView />
    </HydrateClient>
  );
}
