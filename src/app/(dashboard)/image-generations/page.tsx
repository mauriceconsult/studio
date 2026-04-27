import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { ImageGenerationsView } from "@/features/image-generations/views/image-generations-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Image Generation" };

export default async function ImageGenerationsPage() {
  prefetch(trpc.imageGenerations.getAll.queryOptions({}));

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImageGenerationsView />
      </div>
    </HydrateClient>
  );
}
