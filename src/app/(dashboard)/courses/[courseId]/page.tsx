import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { CourseDetailView } from "@/features/courses/views/course-detail-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Course" };

export default async function CourseIdPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  prefetch(trpc.courses.getById.queryOptions({ id: courseId }));
  prefetch(trpc.courses.getAll.queryOptions({}));

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CourseDetailView courseId={courseId} />
      </div>
    </HydrateClient>
  );
}
