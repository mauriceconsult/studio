import { CoursesLayout } from "@/features/courses/views/courses-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CoursesLayout>{children}</CoursesLayout>;
}
