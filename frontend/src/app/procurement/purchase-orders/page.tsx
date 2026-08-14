import { PurchaseOrdersPage } from "@/components/pages/PurchaseOrdersPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Orders | Control Tower",
  description: "Review issued purchase orders and tracking information.",
};

export default function PurchaseOrders() {
  return <PurchaseOrdersPage />;
}
