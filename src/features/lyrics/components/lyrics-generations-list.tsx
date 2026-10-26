"use client";

import { useRouter } from "next/navigation";
import type { LyricsGenerationRecord } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-800",
  PROCESSING: "bg-amber-50 text-amber-800",
  PENDING: "bg-amber-50 text-amber-800",
  FAILED: "bg-red-50 text-red-700",
};

export function LyricsGenerationsList({
  generations,
}: {
  generations: LyricsGenerationRecord[];
}) {
  const router = useRouter();

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14">
        <p className="text-sm text-muted-foreground">
          No lyrics generations yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Use the form above to write your first song.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {generations.map((generation) => (
        <button
          key={generation.id}
          type="button"
          onClick={() =>
            router.push(`/lyrics-generations/${generation.id}`)
          }
          className="group rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-foreground/30"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                STATUS_STYLES[generation.status] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {generation.status.toLowerCase()}
            </span>
            {generation.genre && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {generation.genre}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {generation.prompt}
          </p>
          {generation.lyrics && (
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {generation.lyrics}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(generation.createdAt)}
          </p>
        </button>
      ))}
    </div>
  );
}
