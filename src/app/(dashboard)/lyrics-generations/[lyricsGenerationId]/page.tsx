import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { LyricsGenerationDetailView } from "@/features/lyrics/views/lyrics-generation-detail-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lyrics Generation" };

export default async function LyricsGenerationPage({
  params,
}: {
  params: Promise<{ lyricsGenerationId: string }>;
}) {
  const { lyricsGenerationId } = await params;
  prefetch(
    trpc.lyricsGenerations.getById.queryOptions({ id: lyricsGenerationId }),
  );
  prefetch(trpc.lyricsGenerations.getAll.queryOptions());

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LyricsGenerationDetailView
          lyricsGenerationId={lyricsGenerationId}
        />
      </div>
    </HydrateClient>
  );
}
