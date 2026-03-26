// src/app/(dashboard)/layout.tsx
import { TRPCReactProvider } from "@/trpc/client";
import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <TRPCReactProvider>
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col min-h-0 min-w-0 flex-1">
          {" "}
          {/* ← add flex flex-col flex-1 */}
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TRPCReactProvider>
  );
}
