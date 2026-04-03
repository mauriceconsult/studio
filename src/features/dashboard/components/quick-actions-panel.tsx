"use client";

import { useRouter } from "next/navigation";

interface Action {
  icon: string;
  title: string;
  description: string;
  href: string;
  accent: string;
}

const actions: Action[] = [
  {
    icon: "🔊",
    title: "Text to speech",
    description: "Convert any script into natural-sounding audio.",
    href: "/generate/speech",
    accent: "bg-emerald-50",
  },
  {
    icon: "🎙",
    title: "Clone a voice",
    description: "Upload a sample and replicate any voice in seconds.",
    href: "/generate/voice-clone",
    accent: "bg-blue-50",
  },
  {
    icon: "📚",
    title: "Generate course",
    description: "Turn a script or outline into a full course module.",
    href: "/generate/course",
    accent: "bg-amber-50",
  },
  {
    icon: "🎬",
    title: "Generate video",
    description: "Render a narrated tutorial video from your script.",
    href: "/generate/video",
    accent: "bg-pink-50",
  },
  {
    icon: "⬆",
    title: "Upload audio",
    description: "Import existing recordings for editing or cloning.",
    href: "/upload",
    accent: "bg-purple-50",
  },
  {
    icon: "🗂",
    title: "Voice library",
    description: "Browse, preview, and manage all your saved voices.",
    href: "/voices",
    accent: "bg-orange-50",
  },
];

export function QuickActionsPanel() {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Quick actions
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className="text-left bg-background border border-border rounded-xl p-4 hover:bg-muted hover:border-border/80 transition-colors group"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-3 ${action.accent}`}
            >
              {action.icon}
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {action.title}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {action.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
