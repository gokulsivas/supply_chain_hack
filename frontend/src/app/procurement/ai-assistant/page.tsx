import type { Metadata } from "next";
import { AIProcurementPage } from "@/components/pages/AIProcurementPage";

export const metadata: Metadata = {
  title: "AI Procurement Assistant | Control Tower",
  description: "Conversational requisition and purchase request extraction.",
};

export default function AIProcurementRoute() {
  return <AIProcurementPage />;
}
