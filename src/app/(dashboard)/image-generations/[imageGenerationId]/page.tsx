// ═══════════════════════════════════════════════════════════════════════════════
// app/(studio)/image-generations/[imageGenerationId]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { ImageGenerationDetailView } from "@/features/image-generations/views/image-generation-detail-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Image Generation" };

export default async function ImageGenerationIdPage({
  params,
}: {
  params: Promise<{ imageGenerationId: string }>;
}) {
  const { imageGenerationId } = await params;
  prefetch(trpc.imageGenerations.getById.queryOptions({ id: imageGenerationId }));
  prefetch(trpc.imageGenerations.getAll.queryOptions({}));

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImageGenerationDetailView imageGenerationId={imageGenerationId} />
      </div>
    </HydrateClient>
  );
}
