"use client";

import { useState } from "react";

type Priority = "required" | "recommended" | "optional";

const BADGE: Record<Priority, string> = {
  required: "bg-red-50 text-red-700",
  recommended: "bg-amber-50 text-amber-700",
  optional: "bg-green-50 text-green-700",
};

export interface CheckItem {
  id: string;
  label: string;
  hint: string;
  priority: Priority;
  prompt?: string; // fires sendPrompt if provided
}

interface SectionProps {
  title: string;
  items: CheckItem[];
  tip?: string;
}

function CheckRow({ item }: { item: CheckItem }) {
  const [done, setDone] = useState(false);

  return (
    <div
      onClick={() => setDone((d) => !d)}
      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer
                  transition-all duration-150 select-none
                  ${
                    done
                      ? "bg-muted/40 border-border"
                      : "bg-background border-border hover:border-foreground/30"
                  }`}
    >
      {/* Checkbox */}
      <div
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center
                       rounded-md border-[1.5px] transition-colors
                       ${
                         done
                           ? "border-emerald-500 bg-emerald-500"
                           : "border-border"
                       }`}
      >
        {done && (
          <svg viewBox="0 0 12 12" className="size-3" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p
          className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {item.label}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {item.hint}
        </p>
        <span
          className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${BADGE[item.priority]}`}
        >
          {item.priority}
        </span>
      </div>
    </div>
  );
}

export function CheckSection({ title, items, tip }: SectionProps) {
  // Progress is visual only — each CheckRow manages its own state.
  // For persistence, lift state up or use localStorage in a future iteration.

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>

      <div className="space-y-2">
        {items.map((item) => (
          <CheckRow key={item.id} item={item} />
        ))}
      </div>

      {tip && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Studio AI tip
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
        </div>
      )}
    </div>
  );
}
