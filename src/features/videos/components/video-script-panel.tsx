"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Video = inferRouterOutputs<AppRouter>["videos"]["getById"];

const SCRIPT_MAX_LENGTH = 10_000;
const COST_PER_MINUTE = 0.05;

export function VideoScriptPanel({ video }: { video: Video }) {
  const queryClient = useQueryClient();
  const dispatchedRef = useRef(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const isActive = video.status === "pending" || video.status === "processing";

  useEffect(() => {
    if (!video || dispatchedRef.current || video.status !== "pending") return;
    dispatchedRef.current = true;
    fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id }),
    })
      .then((res) => {
        if (!res.ok) setDispatchError("Failed to start render.");
        else queryClient.invalidateQueries({ queryKey: [["videos", "getById"]] });
      })
      .catch(() => setDispatchError("Network error. Please try again."));
  }, [video.status]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [["videos", "getById"]] });
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <Textarea
          value={video.script}
          readOnly
          className="absolute inset-0 resize-none border-0 bg-transparent p-4 pb-6 lg:p-6 lg:pb-8 text-base! leading-relaxed tracking-tight shadow-none wrap-break-word focus-visible:ring-0 text-muted-foreground"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
      </div>
      <div className="shrink-0 p-4 lg:p-6">
        {dispatchError && <p className="mb-2 text-xs text-red-600">{dispatchError}</p>}
        <div className="hidden items-center justify-between lg:flex">
          <Badge variant="outline" className="gap-1.5 border-dashed">
            <Coins className="size-3 text-chart-5" />
            <span className="text-xs">
              ~<span className="tabular-nums">${COST_PER_MINUTE.toFixed(2)}</span>/min estimated
            </span>
          </Badge>
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-tight">
              {video.script.length.toLocaleString()}
              <span className="text-muted-foreground">&nbsp;/&nbsp;{SCRIPT_MAX_LENGTH.toLocaleString()} characters</span>
            </p>
            {isActive && (
              <Button size="sm" disabled>
                <Loader2 className="size-4 animate-spin" />Rendering…
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
