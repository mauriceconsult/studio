import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { TextGenerationDetailView } from "@/features/text-generations/views/text-generation-detail-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Text Generation" };

export default async function TextGenerationIdPage({
  params,
}: {
  params: Promise<{ textGenerationId: string }>;
}) {
  const { textGenerationId } = await params;
  prefetch(trpc.textGenerations.getById.queryOptions({ id: textGenerationId }));
  prefetch(trpc.textGenerations.getAll.queryOptions());

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TextGenerationDetailView textGenerationId={textGenerationId} />
      </div>
    </HydrateClient>
  );
}
