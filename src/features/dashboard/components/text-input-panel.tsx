"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

type Mode = "speech" | "course" | "video";

const modes: { key: Mode; label: string }[] = [
  { key: "speech",  label: "Speech" },
  { key: "course",  label: "Course" },
  { key: "video",   label: "Video" },
];

const placeholders: Record<Mode, string> = {
  speech: "Paste a script to convert to speech…",
  course: "Paste a course outline or tutorial script…",
  video:  "Paste a script to render as a narrated video…",
};

// Derive a title from the first line of the script (max 60 chars)
function deriveTitle(script: string): string {
  const first = script.trim().split("\n")[0].trim();
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

export function TextInputPanel() {
  const router = useRouter();
  const trpc = useTRPC();

  const [mode, setMode] = useState<Mode>("speech");
  const [script, setScript] = useState("");

  const createCourse = useMutation(trpc.courses.create.mutationOptions());
  const createVideo  = useMutation(trpc.videos.create.mutationOptions());

  const isPending = createCourse.isPending || createVideo.isPending;

  async function handleGenerate() {
    if (!script.trim()) return;
    const title = deriveTitle(script);

    if (mode === "speech") {
      const params = new URLSearchParams({ script });
      router.push(`/text-to-speech?${params.toString()}`);
      return;
    }

    if (mode === "course") {
      const course = await createCourse.mutateAsync({ title, script });
      router.push(`/courses/${course.id}`);
      return;
    }

    if (mode === "video") {
      const video = await createVideo.mutateAsync({ title, script });
      router.push(`/videos/${video.id}`);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Create
      </p>

      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <textarea
          className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-[80px] leading-relaxed"
          placeholder={placeholders[mode]}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          disabled={isPending}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                disabled={isPending}
                className={[
                  "text-xs px-3 py-1.5 rounded-md border transition-colors",
                  mode === m.key
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!script.trim() || isPending}
            className="text-sm font-medium px-4 py-1.5 rounded-md bg-foreground text-background disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
          >
            {isPending ? "Creating…" : "Generate"}
          </button>
        </div>

        {(createCourse.isError || createVideo.isError) && (
          <p className="text-xs text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
