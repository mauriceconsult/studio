"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LyricsGenerationForm } from "../components/lyrics-generation-form";
import { LyricsGenerationsList } from "../components/lyrics-generations-list";

export function LyricsGenerationsView() {
  const trpc = useTRPC();
  const { data: generations } = useSuspenseQuery(
    trpc.lyricsGenerations.getAll.queryOptions(),
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Lyrics Generation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn a song idea into original, structured lyrics.
        </p>
      </header>
      <LyricsGenerationForm />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Recent generations</h2>
        <LyricsGenerationsList generations={generations} />
      </section>
    </div>
  );
}
