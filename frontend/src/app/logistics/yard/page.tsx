import { Metadata } from "next";
import { YardBoardPage } from "@/components/pages/YardBoardPage";

export const metadata: Metadata = {
  title: "Yard Board - Supply Chain Control Tower",
  description: "Monitor inbound trailers, yard positions, and scheduled arrivals.",
};

export default function YardPage() {
  return <YardBoardPage />;
}
