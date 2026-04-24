// ═══════════════════════════════════════════════════════════════════════════════
// app/(dashboard)/image-generations/layout.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import { ImageGenerationsLayout } from "@/features/image-generations/views/image-generations-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ImageGenerationsLayout>{children}</ImageGenerationsLayout>;
}