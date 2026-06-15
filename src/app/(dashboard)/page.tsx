import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboard/views/dashboard-view";

export const metadata: Metadata = { title: "Max AI Studio" };

export default function DashboardPage() {
  return <DashboardView />;
}
