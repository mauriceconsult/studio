"use client";

// ─── image-generations-toolbar.tsx ───────────────────────────────────────────

import { useQueryState } from "nuqs";
import { useMutation as useMutationToolbar } from "@tanstack/react-query";
import { useTRPC as useTRPCToolbar } from "@/trpc/client";
import { useRouter as useRouterToolbar } from "next/navigation";
import { useState as useStateToolbar } from "react";
import { imageGenerationsSearchParams } from "@/features/image-generations/lib/params";
import { IMAGE_STYLES as STYLES } from "@/features/image-generations/lib/types";
import type { ImageStyle as IStyle } from "@/features/image-generations/lib/types";


export function ImageGenerationsToolbar() {
  const [query, setQuery] = useQueryState(
    "query",
    // Pass the nuqs parser directly — fixes "not assignable to string | undefined"
    imageGenerationsSearchParams.query
  );
  const trpc   = useTRPCToolbar();
  const router = useRouterToolbar();
  const [prompt, setPrompt] = useStateToolbar("");
  const [style, setStyle]   = useStateToolbar<IStyle>("photojournalistic");

  const { mutate: create, isPending } = useMutationToolbar(
    trpc.imageGenerations.create.mutationOptions({
      onSuccess: (data) => router.push(`/image-generations/${data.id}`),
    })
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search generations…"
        value={query ?? ""}
        onChange={(e) => setQuery(e.target.value || null)}
        className="h-9 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Describe the image you need…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="h-9 flex-1 min-w-50 rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value as IStyle)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none"
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          disabled={!prompt.trim() || isPending}
          onClick={() => create({ prompt: prompt.trim(), style })}
          className="h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {isPending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
