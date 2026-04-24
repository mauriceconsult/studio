"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { GenerationDetail } from "./text-generation-types";

export function TextGenerationOutputPanel({
  generation,
}: {
  generation: GenerationDetail;
}) {
  const trpc        = useTRPC();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isPending =
      generation.status === "PENDING" || generation.status === "PROCESSING";
    if (isPending) {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: trpc.textGenerations.getById.queryKey({ id: generation.id }),
        });
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [generation.status, generation.id, queryClient, trpc.textGenerations.getById]);

  if (generation.status === "FAILED") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 max-w-sm text-center">
          <p className="text-sm text-red-700">Generation failed. Refine your prompt and try again.</p>
        </div>
      </div>
    );
  }

  if (!generation.output) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <div className="h-1.5 w-48 bg-border rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-amber-400 rounded-full animate-pulse" />
        </div>
        <p className="text-xs text-muted-foreground">Generating text…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Output · {generation.type}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(generation.output!)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Copy
          </button>
        </div>
        <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
          {generation.output}
        </pre>
      </div>
    </div>
  );
}
