"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { useQueryState } from "nuqs";
import { coursesSearchParamsCache } from "@/features/courses/lib/params";

export function CoursesView() {
  const trpc = useTRPC();
  const router = useRouter();
  const [query] = useQueryState("query", coursesSearchParamsCache.parsers.query);

  const { data: courses, isLoading } = useQuery(
    trpc.courses.getAll.queryOptions({ query: query ?? undefined })
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <PageHeader title="Courses" />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && courses?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No courses yet. Generate one from the dashboard.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses?.map((course) => (
          <button
            key={course.id}
            onClick={() => router.push(`/courses/${course.id}`)}
            className="text-left border border-border rounded-xl p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm font-medium text-foreground truncate mb-1">
              {course.title}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {course.status} · {new Date(course.createdAt).toLocaleDateString()}
            </p>
            {course.status === "processing" && (
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
