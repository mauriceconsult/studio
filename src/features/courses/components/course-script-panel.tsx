"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Course = inferRouterOutputs<AppRouter>["courses"]["getById"];

const SCRIPT_MAX_LENGTH = 10_000;
const COST_PER_CHAR = 0.000015;

export function CourseScriptPanel({ course }: { course: Course }) {
  const queryClient = useQueryClient();
  const dispatchedRef = useRef(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const { id: courseId, status } = course;
  const isActive = status === "pending" || status === "processing";

  // Auto-dispatch on mount when pending
  useEffect(() => {
    if (dispatchedRef.current || status !== "pending") return;
    dispatchedRef.current = true;
    fetch("/api/generate-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    })
      .then((res) => {
        if (!res.ok) setDispatchError("Failed to start generation.");
        else {
          queryClient.invalidateQueries({
            queryKey: [["courses", "getById", { id: courseId }]],
          });
        }
      })
      .catch(() => setDispatchError("Network error. Please try again."));
  }, [courseId, queryClient, status]);

  // Poll while active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: [["courses", "getById", { id: courseId }]],
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [courseId, isActive, queryClient]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Script area */}
      <div className="relative min-h-0 flex-1">
        <Textarea
          value={course.script}
          readOnly
          className="absolute inset-0 resize-none border-0 bg-transparent p-4 pb-6 lg:p-6 lg:pb-8 text-base! leading-relaxed tracking-tight shadow-none wrap-break-word focus-visible:ring-0 text-muted-foreground"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
      </div>

      {/* Action bar */}
      <div className="shrink-0 p-4 lg:p-6">
        {dispatchError && (
          <p className="mb-2 text-xs text-red-600">{dispatchError}</p>
        )}
        <div className="hidden items-center justify-between lg:flex">
          <Badge variant="outline" className="gap-1.5 border-dashed">
            <Coins className="size-3 text-chart-5" />
            <span className="text-xs">
              <span className="tabular-nums">
                ${(course.script.length * COST_PER_CHAR).toFixed(4)}
              </span>
              &nbsp;estimated
            </span>
          </Badge>
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-tight">
              {course.script.length.toLocaleString()}
              <span className="text-muted-foreground">
                &nbsp;/&nbsp;{SCRIPT_MAX_LENGTH.toLocaleString()} characters
              </span>
            </p>
            {isActive && (
              <Button size="sm" disabled>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
