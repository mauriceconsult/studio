import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { CoursesView } from "@/features/courses/views/courses-view";
import { coursesSearchParamsCache } from "@/features/courses/lib/params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { query } = await coursesSearchParamsCache.parse(searchParams);
  prefetch(trpc.courses.getAll.queryOptions({ query: query || undefined }));

return (
  <HydrateClient>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CoursesView />
    </div>
  </HydrateClient>
);
}
