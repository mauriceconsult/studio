"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Course = inferRouterOutputs<AppRouter>["courses"]["getById"];

export function CourseOutputPanel({ course }: { course: Course }) {
  if (course.status !== "done" || !course.result) return null;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(course.result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="shrink-0 border-t">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <p className="text-sm font-medium text-foreground">Course output</p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" />
          Download
        </Button>
      </div>
      <div className="max-h-64 overflow-y-auto px-4 pb-4 lg:px-6">
        <pre className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
          {JSON.stringify(course.result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
