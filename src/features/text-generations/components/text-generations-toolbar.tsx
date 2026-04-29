"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { TextType, TEXT_TYPES } from "../lib/types";


export function TextGenerationsToolbar() {
  const trpc   = useTRPC();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [type, setType]     = useState<TextType>("description");

  const { mutate: create, isPending } = useMutation(
    trpc.textGenerations.create.mutationOptions({
      onSuccess: (data) => router.push(`/text-generations/${data.id}`),
    })
  );

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as TextType)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none"
      >
        {TEXT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Describe what to write…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="h-9 flex-1 min-w-64 rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <button
        disabled={!prompt.trim() || isPending}
        onClick={() => create({ type, prompt: prompt.trim() })}
        className="h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
