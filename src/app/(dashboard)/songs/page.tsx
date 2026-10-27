import type { Metadata } from "next";
import { SongsView } from "@/features/songs/views/songs-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Songs" };

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ lyrics?: string; title?: string }>;
}) {
  const { lyrics = "", title = "" } = await searchParams;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SongsView initialLyrics={lyrics} initialTitle={title} />
    </div>
  );
}
