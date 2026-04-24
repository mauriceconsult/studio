// ═══════════════════════════════════════════════════════════════════════════════
// app/(dashboard)/image-generations/loading.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import { Skeleton } from "@/components/ui/skeleton";

export function ImageGenerationsLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // Each card is taller than courses — image previews need vertical space
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default ImageGenerationsLoading;