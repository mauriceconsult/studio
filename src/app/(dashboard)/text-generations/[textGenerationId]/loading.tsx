import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left — prompt + output */}
      <div className="flex flex-1 flex-col gap-0">
        {/* Prompt panel skeleton */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-9 w-24 self-end rounded-lg" />
        </div>
        {/* Output panel skeleton */}
        <div className="flex flex-1 flex-col gap-3 p-4 lg:p-6">
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      {/* Right — settings panel skeleton */}
      <div className="hidden lg:flex w-72 flex-col border-l border-border">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
