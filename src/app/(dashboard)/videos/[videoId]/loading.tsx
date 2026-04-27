import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-4xl">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-1.5 w-64 rounded-full" />
      <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />
    </div>
  );
}
