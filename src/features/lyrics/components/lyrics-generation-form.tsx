"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Textarea } from "@/components/ui/textarea";

type LyricsDraft = {
  prompt: string;
  genre?: string | null;
  mood?: string | null;
  language?: string;
  targetTempoBpm?: number | null;
  targetDurationMs?: number | null;
  sourceApp?: string;
  sourceEntityId?: string | null;
};

export function LyricsGenerationForm({
  initialValues,
}: {
  initialValues?: LyricsDraft;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? "");
  const [genre, setGenre] = useState(initialValues?.genre ?? "");
  const [mood, setMood] = useState(initialValues?.mood ?? "");
  const [language, setLanguage] = useState(initialValues?.language ?? "English");
  const [tempo, setTempo] = useState(
    initialValues?.targetTempoBpm?.toString() ?? "",
  );
  const [duration, setDuration] = useState(
    initialValues?.targetDurationMs
      ? String(Math.round(initialValues.targetDurationMs / 1000))
      : "",
  );

  const { mutate: create, isPending } = useMutation(
    trpc.lyricsGenerations.create.mutationOptions({
      onSuccess: async ({ id }) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.lyricsGenerations.getAll.queryKey(),
        });
        router.push(`/lyrics-generations/${id}`);
      },
      onError: (error) => {
        toast.error(
          error.message === "SUBSCRIPTION_REQUIRED"
            ? "An active subscription is required to generate lyrics."
            : error.message,
        );
      },
    }),
  );

  function submit() {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 10) {
      toast.error("Describe your song in at least 10 characters.");
      return;
    }

    create({
      prompt: trimmedPrompt,
      genre: genre.trim() || undefined,
      mood: mood.trim() || undefined,
      language: language.trim() || "English",
      tempoBpm: tempo ? Number(tempo) : undefined,
      targetDurationSeconds: duration ? Number(duration) : undefined,
      sourceApp: initialValues?.sourceApp ?? "studio",
      sourceEntityId: initialValues?.sourceEntityId ?? undefined,
    });
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4 lg:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">
          {initialValues ? "Regenerate lyrics" : "Create lyrics"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Describe the song you want. Genre, mood, tempo and duration are
          optional.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Song brief
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="What is the song about? Include a story, point of view, or ideas for the chorus."
            className="resize-y text-sm font-normal"
          />
          <span className="text-right font-normal text-muted-foreground">
            {prompt.length}/2000
          </span>
        </label>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Genre
            <input
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              maxLength={80}
              placeholder="e.g. Afrobeat"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Mood
            <input
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              maxLength={80}
              placeholder="e.g. Hopeful"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Language
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              maxLength={40}
              placeholder="English"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Tempo (BPM)
            <input
              type="number"
              min={40}
              max={240}
              value={tempo}
              onChange={(event) => setTempo(event.target.value)}
              placeholder="40–240"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium sm:col-span-2">
            Target duration (seconds)
            <input
              type="number"
              min={30}
              max={600}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="30–600"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={isPending || prompt.trim().length < 10}
          onClick={submit}
          className="h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Generating…" : initialValues ? "Regenerate" : "Generate lyrics"}
        </button>
      </div>
    </section>
  );
}
