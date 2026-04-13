"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { CourseScriptPanel } from "../components/course-script-panel";
import { CourseOutputPanel } from "../components/course-output-panel";
import { CourseSettingsPanel } from "../components/course-settings-panel";

export function CourseDetailView({ courseId }: { courseId: string }) {
  const trpc = useTRPC();
  const { data: course } = useSuspenseQuery(
    trpc.courses.getById.queryOptions({ id: courseId })
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left — script input + output */}
      <div className="flex min-h-0 flex-1 flex-col">
        <CourseScriptPanel course={course} />
        <CourseOutputPanel course={course} />
      </div>
      {/* Right — settings + history */}
      <CourseSettingsPanel course={course} />
    </div>
  );
}
