"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Image from "next/image";

type GenerationDetail = {
  id:     string;
  output: string | null;
  status: string;
  prompt: string;
};

export function ImageGenerationOutputPanel({
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
          queryKey: trpc.imageGenerations.getById.queryKey({ id: generation.id }),
        });
      }, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [generation.status, generation.id, queryClient, trpc.imageGenerations.getById]);

  if (generation.status === "FAILED") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 max-w-sm text-center">
          <p className="text-sm text-red-700">
            Generation failed. Refine your prompt and try again.
          </p>
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
        <p className="text-xs text-muted-foreground">Generating image…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="relative w-full aspect-square bg-muted">
          <Image
            src={generation.output}
            alt={generation.prompt}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate max-w-xs">
            {generation.prompt}
          </p>
          <a
            href={generation.output}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-4"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
