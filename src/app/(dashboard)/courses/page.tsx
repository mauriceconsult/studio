import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { prefetch, trpc, HydrateClient } from "@/trpc/server";
import { CoursesView } from "@/features/courses/views/courses-view";
import { coursesSearchParamsCache } from "@/features/courses/lib/params";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { query } = await coursesSearchParamsCache.parse(searchParams);

  prefetch(trpc.courses.getAll.queryOptions({ query }));

  return (
    <HydrateClient>
      <CoursesView />
    </HydrateClient>
  );
}
