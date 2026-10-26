"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { LyricsGenerationRecord } from "../lib/types";

export function LyricsGenerationOutput({
  generation,
}: {
  generation: LyricsGenerationRecord;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (generation.status === "PENDING" || generation.status === "PROCESSING") {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: trpc.lyricsGenerations.getById.queryKey({
            id: generation.id,
          }),
        });
      }, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [generation.id, generation.status, queryClient, trpc.lyricsGenerations.getById]);

  if (generation.status === "FAILED") {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Lyrics generation failed.</p>
        <p className="mt-1 text-xs text-red-700">
          Review the brief and try generating again.
        </p>
      </section>
    );
  }

  if (!generation.lyrics) {
    return (
      <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border p-6">
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
        </div>
        <p className="text-xs text-muted-foreground">Writing your lyrics…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Generated lyrics</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              generation.language,
              generation.mood,
              generation.targetTempoBpm
                ? `${generation.targetTempoBpm} BPM`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              .writeText(generation.lyrics ?? "")
              .then(() => toast.success("Lyrics copied"))
              .catch(() => toast.error("Could not copy lyrics"));
          }}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
        {generation.lyrics}
      </pre>
    </section>
  );
}
