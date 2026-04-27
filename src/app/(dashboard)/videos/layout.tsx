import { VideosLayout } from "@/features/videos/views/videos-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <VideosLayout>{children}</VideosLayout>;
}
