/**
 * components/launcher/AppLauncher.tsx
 * Generic cross-app launcher — works in any of the three apps.
 *
 * Usage in studio:
 *   <AppLauncher app="instaskul" label="Open in Instaskul" />
 *
 * Usage in instaskul:
 *   <AppLauncher app="studio" label="Generate content" courseId={course.id} />
 *
 * Usage in vendly (future):
 *   <AppLauncher app="studio" label="Create product video" />
 */

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

type TargetApp = "instaskul" | "studio" | "vendly";

interface AppLauncherProps {
  app: TargetApp;
  label?: string;
  courseId?: string;
  productId?: string;
  className?: string;
  variant?: "button" | "menu-item";
}

const APP_CONFIG: Record<TargetApp, { defaultLabel: string; color: string }> = {
  studio:    { defaultLabel: "Open in Studio",    color: "bg-black text-white hover:bg-gray-800" },
  instaskul: { defaultLabel: "Open in Instaskul", color: "bg-indigo-600 text-white hover:bg-indigo-700" },
  vendly:    { defaultLabel: "Open in Vendly",    color: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

export function AppLauncher({
  app,
  label,
  courseId,
  productId,
  className,
  variant = "button",
}: AppLauncherProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = APP_CONFIG[app];

  async function handleLaunch() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = {};
      if (courseId)  body.courseId  = courseId;
      if (productId) body.productId = productId;

      const res = await fetch(`/api/launcher/${app}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? `Failed to launch ${app}`);
      }

      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "menu-item") {
    return (
      <button
        onClick={handleLaunch}
        disabled={loading || !user}
        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md disabled:opacity-40 transition-colors"
      >
        {loading ? "Launching…" : (label ?? config.defaultLabel)}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleLaunch}
        disabled={loading || !user}
        className={
          className ??
          `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
           disabled:opacity-40 disabled:cursor-not-allowed transition-colors
           ${config.color}`
        }
      >
        {loading ? (
          <>
            <Spinner />
            Launching…
          </>
        ) : (
          label ?? config.defaultLabel
        )}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}
