"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { GenerationDetail, TEXT_TYPES, TextType } from "../lib/types";


export function TextGenerationPromptPanel({
  generation,
}: {
  generation: GenerationDetail;
}) {
  const trpc        = useTRPC();
  const queryClient = useQueryClient();
  const router      = useRouter();
  const [prompt, setPrompt] = useState(generation.prompt);
  const [type, setType]     = useState<TextType>(generation.type as TextType);

  const { mutate: regenerate, isPending } = useMutation(
    trpc.textGenerations.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.textGenerations.getAll.queryKey(),
        });
        router.push(`/text-generations/${data.id}`);
      },
    })
  );

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Prompt</h2>
        {generation.sourceEntityId && (
          <span className="text-xs text-muted-foreground">
            {generation.sourceApp} / {generation.sourceEntityId.slice(0, 8)}…
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TextType)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none shrink-0"
        >
          {TEXT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm resize-none outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        placeholder="Describe what to write…"
      />

      <button
        disabled={!prompt.trim() || isPending}
        onClick={() =>
          regenerate({
            type,
            prompt: prompt.trim(),
            sourceEntityId: generation.sourceEntityId ?? undefined,
          })
        }
        className="self-end h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
