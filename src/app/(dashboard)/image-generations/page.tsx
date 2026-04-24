// ═══════════════════════════════════════════════════════════════════════════════
// app/(studio)/image-generations/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { imageGenerationsSearchParamsCache } from "@/features/image-generations/lib/params";
import { ImageGenerationsView } from "@/features/image-generations/views/image-generations-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Image Generations" };

export default async function ImageGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { query } = await imageGenerationsSearchParamsCache.parse(searchParams);
  prefetch(trpc.imageGenerations.getAll.queryOptions({ query: query || undefined }));

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImageGenerationsView />
      </div>
    </HydrateClient>
  );
}
