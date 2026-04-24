// ═══════════════════════════════════════════════════════════════════════════════
// features/image-generations/views/image-generations-view.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// "use client"

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/client";
import { imageGenerationsSearchParams } from "../lib/params";
import { ImageGenerationsList } from "@/features/image-generations/components/image-generations-list";
import { ImageGenerationsToolbar } from "@/features/image-generations/components/image-generations-toolbar";

function ImageGenerationsContent() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", imageGenerationsSearchParams.query);
  const { data: generations } = useSuspenseQuery(
    trpc.imageGenerations.getAll.queryOptions({ query: query || undefined })
  );
  return <ImageGenerationsList generations={generations} />;
}
export function ImageGenerationsView() {
  return (
    <div className="flex-1 space-y-10 overflow-y-auto p-3 lg:p-6">
      <ImageGenerationsToolbar />
      <ImageGenerationsContent />
    </div>
  );
}