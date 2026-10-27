import type { Metadata } from "next";
import { MusicVideosView } from "@/features/music-videos/views/music-videos-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Music videos" };

export default async function MusicVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ songId?: string; title?: string }>;
}) {
  const { songId = "", title = "" } = await searchParams;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MusicVideosView initialSongId={songId} initialTitle={title} />
    </div>
  );
}
