import { PageHeader } from "@/components/page-header";

export function CoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader title="Courses" />
      {children}
    </div>
  );
}
