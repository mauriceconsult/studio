"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

type GenerationDetail = {
  id:        string;
  style:     string | null;
  size:      string | null;
  status:    string;
  sourceApp: string;
  prompt:    string;
  output:    string | null;
};

export function ImageGenerationSettingsPanel({
  generation,
}: {
  generation: GenerationDetail;
}) {
  const trpc   = useTRPC();
  const router = useRouter();
  const { data: allGenerations } = useSuspenseQuery(
    trpc.imageGenerations.getAll.queryOptions({}),
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
            <dt className="text-muted-foreground">Style</dt>
            <dd className="capitalize">{generation.style ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Size</dt>
            <dd>{generation.size ?? "—"}</dd>
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
                onClick={() => router.push(`/image-generations/${g.id}`)}
                className="group text-left rounded-lg border border-border overflow-hidden hover:border-foreground/30 transition-colors"
              >
                {g.outputUrl ? (
                  <div className="relative w-full aspect-video bg-muted">
                    <Image
                      src={g.outputUrl}
                      alt={g.prompt}
                      fill
                      className="object-cover"
                      sizes="288px"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                    <div className="h-1 w-12 bg-border rounded-full animate-pulse" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors leading-relaxed">
                    {g.prompt}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
