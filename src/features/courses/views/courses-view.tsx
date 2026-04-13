"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/client";
import { CoursesToolbar } from "../components/courses-toolbar";
import { CoursesList } from "../components/courses-list";
import { coursesSearchParams } from "../lib/params";

function CoursesContent() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", coursesSearchParams.query);
  const { data: courses } = useSuspenseQuery(
    trpc.courses.getAll.queryOptions({ query: query || undefined })
  );

  return <CoursesList courses={courses} />;
}

export function CoursesView() {
  return (
    <div className="flex-1 space-y-10 overflow-y-auto p-3 lg:p-6">
      <CoursesToolbar />
      <CoursesContent />
    </div>
  );
}
