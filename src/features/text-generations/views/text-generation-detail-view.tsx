"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TextGenerationPromptPanel } from "../components/text-generation-prompt-panel";
import { TextGenerationOutputPanel } from "../components/text-generation-output-panel";
import { TextGenerationSettingsPanel } from "../components/text-generation-settings-panel";

export function TextGenerationDetailView({
  textGenerationId,
}: {
  textGenerationId: string;
}) {
  const trpc = useTRPC();
  const { data: generation } = useSuspenseQuery(
    trpc.textGenerations.getById.queryOptions({ id: textGenerationId })
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left — prompt input + output */}
      <div className="flex min-h-0 flex-1 flex-col">
        <TextGenerationPromptPanel generation={generation} />
        <TextGenerationOutputPanel generation={generation} />
      </div>
      {/* Right — details + history */}
      <TextGenerationSettingsPanel generation={generation} />
    </div>
  );
}