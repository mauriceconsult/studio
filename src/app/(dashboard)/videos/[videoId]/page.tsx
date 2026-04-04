import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { VideoView } from "@/features/videos/views/video-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Video" };

export default async function VideoIdPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;

  prefetch(trpc.videos.getById.queryOptions({ id: videoId }));

  return (
    <HydrateClient>
      <VideoView videoId={videoId} />
    </HydrateClient>
  );
}
