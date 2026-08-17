import type { Metadata } from "next";
import { LoginPage } from "@/components/pages/LoginPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Supply Chain Control Tower.",
};

export default function Page() {
  return <LoginPage />;
}
