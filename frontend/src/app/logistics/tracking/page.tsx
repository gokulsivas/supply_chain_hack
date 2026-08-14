import type { Metadata } from "next";
import TruckTrackingPage from "@/components/pages/TruckTrackingPage";

export const metadata: Metadata = {
  title: "Truck Tracking",
  description: "Live delivery tracker for inbound shipments, trailer status, ETA, and operational alerts.",
};

export default function Page() {
  return <TruckTrackingPage />;
}
