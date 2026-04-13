"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type CourseItem = inferRouterOutputs<AppRouter>["courses"]["getAll"][number];

const STATUS_STYLES = {
  pending:    "bg-muted text-muted-foreground",
  processing: "bg-amber-50 text-amber-800",
  done:       "bg-emerald-50 text-emerald-800",
  error:      "bg-red-50 text-red-700",
} as const;

function CourseCard({ course }: { course: CourseItem }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/courses/${course.id}`)}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {course.title}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[course.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.pending}`}>
          {course.status}
        </span>
      </div>
      {(course.status === "processing" || course.status === "pending") && (
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${course.progress}%` }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(course.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}

export function CoursesList({ courses }: { courses: CourseItem[] }) {
  if (!courses.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="rounded-full bg-muted p-4">
          <BookOpen className="size-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold tracking-tight">No courses yet</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Generate your first course from the dashboard. Paste a script and choose Course mode.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
