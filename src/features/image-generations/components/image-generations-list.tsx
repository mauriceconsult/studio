"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// components/image-generations-list.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import Image from "next/image";

type Generation = {
  id: string;
  prompt: string;
  style: string | null;
  status: string;
  outputUrl: string | null;
  createdAt: Date;
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:  "bg-emerald-50 text-emerald-800",
  PROCESSING: "bg-amber-50 text-amber-800",
  PENDING:    "bg-amber-50 text-amber-800",
  FAILED:     "bg-red-50 text-red-700",
};

export function ImageGenerationsList({
  generations,
}: {
  generations: Generation[];
}) {
  const router = useRouter();

  if (!generations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-foreground">No image generations yet.</p>
        <p className="text-xs text-muted-foreground">
          Use the toolbar above to generate your first image.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {generations.map((gen) => (
        <button
          key={gen.id}
          onClick={() => router.push(`/image-generations/${gen.id}`)}
          className="group text-left rounded-xl border border-border bg-background overflow-hidden hover:border-foreground/30 transition-colors"
        >
          {/* Image preview */}
          <div className="relative aspect-video w-full bg-muted overflow-hidden">
            {gen.outputUrl ? (
              <Image
                src={gen.outputUrl}
                alt={gen.prompt}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">
                  {gen.status === "FAILED" ? "Failed" : "Generating…"}
                </span>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="p-3 space-y-1.5">
            <p className="text-sm font-medium leading-snug line-clamp-2">
              {gen.prompt}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  STATUS_STYLES[gen.status] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {gen.status.toLowerCase()}
              </span>
              {gen.style && (
                <span className="text-xs text-muted-foreground capitalize">
                  {gen.style}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}