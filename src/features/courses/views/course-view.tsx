"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";

interface CourseViewProps {
  courseId: string;
}

export function CourseView({ courseId }: CourseViewProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dispatchedRef = useRef(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const { data: course, refetch } = useQuery(
    trpc.courses.getById.queryOptions({ id: courseId })
  );

  // Dispatch to PLATFORM_API once on mount if still pending
  useEffect(() => {
    if (!course || dispatchedRef.current) return;
    if (course.status !== "pending") return;

    dispatchedRef.current = true;

    fetch("/api/generate-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    })
      .then((res) => {
        if (!res.ok) setDispatchError("Failed to start generation. Please try again.");
        else refetch();
      })
      .catch(() => setDispatchError("Network error. Please try again."));
  }, [course?.status]);

  // Poll while processing
  useEffect(() => {
    if (!course) return;
    if (course.status === "processing" || course.status === "pending") {
      intervalRef.current = setInterval(() => refetch(), 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [course?.status]);

  if (!course) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-4xl">
      <button
        onClick={() => router.push("/courses")}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        Back to Courses
      </button>

      <PageHeader title={course.title} />

      <div className="flex items-center gap-2">
        <span
          className={[
            "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
            course.status === "done"
              ? "bg-emerald-50 text-emerald-800"
              : course.status === "processing" || course.status === "pending"
              ? "bg-amber-50 text-amber-800"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {course.status}
        </span>
        {(course.status === "processing" || course.status === "pending") && (
          <span className="text-xs text-muted-foreground">{course.progress}%</span>
        )}
      </div>

      {(course.status === "processing" || course.status === "pending") && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden max-w-sm">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${course.progress}%` }}
          />
        </div>
      )}

      {dispatchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{dispatchError}</p>
        </div>
      )}

      {course.status === "done" && course.result && (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Output
          </p>
          <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed overflow-auto">
            {JSON.stringify(course.result, null, 2)}
          </pre>
        </div>
      )}

      {course.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {course.errorMessage ?? "An error occurred during generation."}
          </p>
        </div>
      )}
    </div>
  );
}
