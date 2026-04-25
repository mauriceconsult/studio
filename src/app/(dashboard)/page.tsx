import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboard/views/dashboard-view";

export const metadata: Metadata = { title: "Studio" };

export default function DashboardPage() {
  return <DashboardView />;
}
