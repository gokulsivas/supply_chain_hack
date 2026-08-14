import { Metadata } from "next";
import { DockAssignmentPage } from "@/components/pages/DockAssignmentPage";

export const metadata: Metadata = {
  title: "Dock Assignment - Supply Chain Control Tower",
  description: "Recommend and assign dock doors using load suitability, priority, and availability.",
};

export default function DocksPage() {
  return <DockAssignmentPage />;
}
