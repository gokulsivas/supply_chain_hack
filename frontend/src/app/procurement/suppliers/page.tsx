import { SuppliersPage } from "@/components/pages/SuppliersPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier Recommendations | Control Tower",
  description: "Compare eligible suppliers and approve purchase orders.",
};

export default function Suppliers() {
  return <SuppliersPage />;
}
