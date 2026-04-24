"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { GenerationDetail } from "./text-generation-types";


export function TextGenerationSettingsPanel({
  generation,
}: {
  generation: GenerationDetail;
}) {
  const trpc   = useTRPC();
  const router = useRouter();
  const { data: allGenerations } = useSuspenseQuery(
    trpc.textGenerations.getAll.queryOptions(),
  );

  const recentOthers = allGenerations
    .filter((g) => g.id !== generation.id)
    .slice(0, 8);

  return (
    <div className="hidden lg:flex w-72 flex-col border-l border-border overflow-y-auto">
      <div className="p-4 border-b border-border">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Details
        </p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="capitalize">{generation.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{generation.status.toLowerCase()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="truncate max-w-30">{generation.sourceApp}</dd>
          </div>
        </dl>
      </div>

      {recentOthers.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
            Recent
          </p>
          <div className="flex flex-col gap-2">
            {recentOthers.map((g) => (
              <button
                key={g.id}
                onClick={() => router.push(`/text-generations/${g.id}`)}
                className="group text-left rounded-lg border border-border p-3 hover:border-foreground/30 transition-colors"
              >
                <div className="flex gap-1.5 mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {g.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors leading-relaxed">
                  {g.output ?? g.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
