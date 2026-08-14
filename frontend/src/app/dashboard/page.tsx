import type { Metadata } from "next";
import DashboardPage from "@/components/pages/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Supply Chain Control Tower — overview of procurement, logistics, and finance operations.",
};

export default function Page() {
  return <DashboardPage />;
}
