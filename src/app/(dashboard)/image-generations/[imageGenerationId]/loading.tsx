// ═══════════════════════════════════════════════════════════════════════════════
// app/(studio)/image-generations/[imageGenerationId]/loading.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import { Skeleton } from "@/components/ui/skeleton";

export function ImageGenerationDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-4xl">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-6 w-20 rounded-full" />
      {/* Image output placeholder — 16:9 at max-w */}
      <Skeleton className="w-full aspect-video rounded-xl" />
    </div>
  );
}

export default ImageGenerationDetailLoading;