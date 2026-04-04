import type { Metadata } from "next";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { CourseView } from "@/features/courses/views/course-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Course" };

export default async function CourseIdPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  prefetch(trpc.courses.getById.queryOptions({ id: courseId }));

  return (
    <HydrateClient>
      <CourseView courseId={courseId} />
    </HydrateClient>
  );
}
