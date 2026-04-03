"use client";

// import {
//   COST_PER_UNIT,
//   TEXT_MAX_LENGTH,
// } from "@/features/text-to-speech/data/constants";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "speech" | "voice-clone" | "course" | "video";

const modes: { key: Mode; label: string }[] = [
  { key: "speech", label: "Speech" },
  { key: "voice-clone", label: "Voice clone" },
  { key: "course", label: "Course" },
  { key: "video", label: "Video" },
];

const placeholders: Record<Mode, string> = {
  "speech": "Paste a script to convert to speech…",
  "voice-clone": "Describe the voice style or paste a sample transcript…",
  "course": "Paste a course outline or tutorial script…",
  "video": "Paste a script to render as a narrated video…",
};

const routes: Record<Mode, string> = {
  "speech": "/generate/speech",
  "voice-clone": "/generate/voice-clone",
  "course": "/generate/course",
  "video": "/generate/video",
};

export function TextInputPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("speech");
  const [script, setScript] = useState("");

  function handleGenerate() {
    if (!script.trim()) return;
    const params = new URLSearchParams({ script });
    router.push(`${routes[mode]}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Create
      </p>

      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <textarea
          className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-20 leading-relaxed"
          placeholder={placeholders[mode]}
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Mode tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
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

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!script.trim()}
            className="text-sm font-medium px-4 py-1.5 rounded-md bg-foreground text-background disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
