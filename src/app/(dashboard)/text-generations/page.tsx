import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { TextGenerationsView } from "@/features/text-generations/views/text-generations-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Text Generation" };

export default async function TextGenerationsPage() {
  prefetch(trpc.textGenerations.getAll.queryOptions());

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TextGenerationsView />
      </div>
    </HydrateClient>
  );
}
