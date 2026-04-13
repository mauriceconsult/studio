"use client";

import { History, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Course = inferRouterOutputs<AppRouter>["courses"]["getById"];

const tabTriggerClassName =
  "flex-1 h-full gap-2 bg-transparent rounded-none border-x-0 border-t-0 border-b-px border-b-transparent shadow-none data-[state=active]:border-b-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none";

function CourseInfo({ course }: { course: Course }) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Status</p>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize
          ${course.status === "done" ? "bg-emerald-50 text-emerald-800"
            : course.status === "error" ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-800"}`}>
          {course.status}
        </span>
      </div>
      {(course.status === "processing" || course.status === "pending") && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Progress</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${course.progress}%` }} />
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">{course.progress}%</p>
        </div>
      )}
      {course.errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">{course.errorMessage}</p>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Created</p>
        <p className="text-sm text-foreground">
          {formatDistanceToNow(new Date(course.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Characters</p>
        <p className="text-sm text-foreground">{course.script.length.toLocaleString()}</p>
      </div>
    </div>
  );
}

function CourseHistory() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: courses } = useSuspenseQuery(trpc.courses.getAll.queryOptions({}));

  return (
    <div className="overflow-y-auto p-2">
      {courses.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/courses/${c.id}`)}
          className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors"
        >
          <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {c.status} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
          </p>
        </button>
      ))}
    </div>
  );
}

export function CourseSettingsPanel({ course }: { course: Course }) {
  return (
    <div className="hidden w-105 min-h-0 flex-col border-l lg:flex">
      <Tabs defaultValue="settings" className="flex h-full min-h-0 flex-col gap-y-0">
        <TabsList className="w-full bg-transparent rounded-none border-b h-12 group-data-[orientation=horizontal]/tabs:h-12 p-0">
          <TabsTrigger value="settings" className={tabTriggerClassName}>
            <Settings className="size-4" />Settings
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClassName}>
            <History className="size-4" />History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <CourseInfo course={course} />
        </TabsContent>
        <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <CourseHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
