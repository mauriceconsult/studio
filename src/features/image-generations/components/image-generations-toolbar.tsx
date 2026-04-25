"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";

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

export function ImageGenerationsToolbar() {
  const trpc   = useTRPC();
  const router = useRouter();
  const [prompt, setPrompt]     = useState("");
  const [style, setStyle]       = useState<ImageStyle>("photojournalistic");
  const [sizeValue, setSizeValue] = useState<ImageSizeValue>("1024x1024");

  const { mutate: create, isPending } = useMutation(
    trpc.imageGenerations.create.mutationOptions({
      onSuccess: (data) => router.push(`/image-generations/${data.id}`),
    })
  );

  function handleCreate() {
    const size = IMAGE_SIZES.find((s) => s.value === sizeValue)!;
    create({
      prompt: prompt.trim(),
      style,
      width:  size.width,
      height: size.height,
    });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={style}
        onChange={(e) => setStyle(e.target.value as ImageStyle)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground outline-none"
      >
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
      <input
        type="text"
        placeholder="Describe the image…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="h-9 flex-1 min-w-64 rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <button
        disabled={!prompt.trim() || isPending}
        onClick={handleCreate}
        className="h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
