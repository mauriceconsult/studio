import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { LyricsGenerationsView } from "@/features/lyrics/views/lyrics-generations-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lyrics Generation" };

export default async function LyricsGenerationsPage() {
  prefetch(trpc.lyricsGenerations.getAll.queryOptions());

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LyricsGenerationsView />
      </div>
    </HydrateClient>
  );
}
