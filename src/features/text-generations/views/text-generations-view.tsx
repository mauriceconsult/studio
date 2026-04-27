"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TextGenerationsToolbar } from "../components/text-generations-toolbar";
import { TextGenerationsList } from "../components/text-generations-list";

export function TextGenerationsView() {
  const trpc = useTRPC();

  const { data: generations } = useSuspenseQuery(
    trpc.textGenerations.getAll.queryOptions()
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <TextGenerationsToolbar />
      <TextGenerationsList generations={generations} />
    </div>
  );
}
