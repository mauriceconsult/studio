"use client";

// ─── TextGenerationsList ──────────────────────────────────────────────────────

import { useRouter as useRouterList } from "next/navigation";

type TextGeneration = {
  id:        string;
  type:      string;
  prompt:    string;
  output:    string | null;
  status:    string;
  createdAt: Date;
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:  "bg-emerald-50 text-emerald-800",
  PROCESSING: "bg-amber-50 text-amber-800",
  PENDING:    "bg-amber-50 text-amber-800",
  FAILED:     "bg-red-50 text-red-700",
};

export function TextGenerationsList({
  generations,
}: {
  generations: TextGeneration[];
}) {
  const router = useRouterList();

  if (!generations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-foreground">No text generations yet.</p>
        <p className="text-xs text-muted-foreground">Use the toolbar above to generate your first piece.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {generations.map((gen) => (
        <button
          key={gen.id}
          onClick={() => router.push(`/text-generations/${gen.id}`)}
          className="group text-left rounded-xl border border-border bg-background p-4 space-y-2 hover:border-foreground/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              {gen.type}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                STATUS_STYLES[gen.status] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {gen.status.toLowerCase()}
            </span>
          </div>

          <p className="text-sm font-medium leading-snug line-clamp-2">{gen.prompt}</p>

          {gen.output && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {gen.output}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}