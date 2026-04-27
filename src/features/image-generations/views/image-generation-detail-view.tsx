"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ImageGenerationPromptPanel } from "../components/image-generation-prompt-panel";
import { ImageGenerationOutputPanel } from "../components/image-generation-output-panel";
import { ImageGenerationSettingsPanel } from "../components/image-generation-settings-panel";

export function ImageGenerationDetailView({
  imageGenerationId,
}: {
  imageGenerationId: string;
}) {
  const trpc = useTRPC();
  const { data: raw } = useSuspenseQuery(
    trpc.imageGenerations.getById.queryOptions({ id: imageGenerationId })
  );

  // Map DB field names → panel prop names
  // DB uses `outputUrl`; panels expect `output`
  // DB may not have `size` at the top level — cast safely
  const generation = {
    ...raw,
    output: raw.outputUrl ?? null,
    size:   ((raw as Record<string, unknown>).size as string | null) ?? null,
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left — prompt input + output image */}
      <div className="flex min-h-0 flex-1 flex-col">
        <ImageGenerationPromptPanel generation={generation} />
        <ImageGenerationOutputPanel generation={generation} />
      </div>
      {/* Right — style + size settings + history */}
      <ImageGenerationSettingsPanel generation={generation} />
    </div>
  );
}
