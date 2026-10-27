import type { Metadata } from "next";
import { MusicVideoEditor } from "@/features/music-videos/views/music-video-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Music video editor" };

export default async function MusicVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MusicVideoEditor id={id} />
    </div>
  );
}
