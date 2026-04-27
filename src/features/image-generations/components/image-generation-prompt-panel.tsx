"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";

const IMAGE_STYLES = [
  { value: "photojournalistic", label: "Photojournalistic" },
  { value: "editorial",         label: "Editorial"         },
  { value: "documentary",       label: "Documentary"       },
  { value: "portrait",          label: "Portrait"          },
] as const;

type ImageStyle = (typeof IMAGE_STYLES)[number]["value"];

const IMAGE_SIZES = [
  { value: "1024x1024", label: "1:1 Square",    width: 1024, height: 1024 },
  { value: "1792x1024", label: "16:9 Wide",     width: 1792, height: 1024 },
  { value: "1024x1792", label: "9:16 Portrait", width: 1024, height: 1792 },
] as const;

type ImageSizeValue = (typeof IMAGE_SIZES)[number]["value"];

type GenerationDetail = {
  id:             string;
  style:          string | null;
  size:           string | null;
  prompt:         string;
  output:         string | null;
  status:         string;
  sourceApp:      string;
  sourceEntityId: string | null;
};

export function ImageGenerationPromptPanel({
  generation,
}: {
  generation: GenerationDetail;
}) {
  const trpc        = useTRPC();
  const queryClient = useQueryClient();
  const router      = useRouter();
  const [prompt, setPrompt] = useState(generation.prompt);
  const [style, setStyle]   = useState<ImageStyle | undefined>(
    IMAGE_STYLES.find((s) => s.value === generation.style)?.value
  );
  const [sizeValue, setSizeValue] = useState<ImageSizeValue>("1024x1024");

  const { mutate: regenerate, isPending } = useMutation(
    trpc.imageGenerations.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.imageGenerations.getAll.queryKey(),
        });
        router.push(`/image-generations/${data.id}`);
      },
    })
  );

  function handleRegenerate() {
    const size = IMAGE_SIZES.find((s) => s.value === sizeValue)!;
    regenerate({
      prompt: prompt.trim(),
      style,
      width:  size.width,
      height: size.height,
      sourceEntityId: generation.sourceEntityId ?? undefined,
    });
  }

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

      <div className="flex gap-2 flex-wrap">
        <select
          value={style ?? ""}
          onChange={(e) => setStyle((e.target.value as ImageStyle) || undefined)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none"
        >
          <option value="">No style</option>
          {IMAGE_STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={sizeValue}
          onChange={(e) => setSizeValue(e.target.value as ImageSizeValue)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none"
        >
          {IMAGE_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm resize-none outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        placeholder="Describe the image you want to generate…"
      />

      <button
        disabled={!prompt.trim() || isPending}
        onClick={handleRegenerate}
        className="self-end h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
