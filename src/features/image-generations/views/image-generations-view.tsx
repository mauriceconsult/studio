"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ImageGenerationsToolbar } from "../components/image-generations-toolbar";
import { ImageGenerationsList } from "../components/image-generations-list";

export function ImageGenerationsView() {
  const trpc = useTRPC();

  const { data: generations } = useSuspenseQuery(
    trpc.imageGenerations.getAll.queryOptions({})
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <ImageGenerationsToolbar />
      <ImageGenerationsList generations={generations} />
    </div>
  );
}
