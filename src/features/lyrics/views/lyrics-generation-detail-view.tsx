"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LyricsGenerationForm } from "../components/lyrics-generation-form";
import { LyricsGenerationOutput } from "../components/lyrics-generation-output";

export function LyricsGenerationDetailView({
  lyricsGenerationId,
}: {
  lyricsGenerationId: string;
}) {
  const trpc = useTRPC();
  const { data: generation } = useSuspenseQuery(
    trpc.lyricsGenerations.getById.queryOptions({ id: lyricsGenerationId }),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Lyrics generation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review this version or adjust the brief to generate another.
        </p>
      </header>
      <LyricsGenerationOutput generation={generation} />
      <LyricsGenerationForm
        key={generation.id}
        initialValues={generation}
      />
    </div>
  );
}
