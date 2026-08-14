"use client";

/**
 * Root page — client-side redirect only. No visual output.
 *
 * Unauthenticated → /login
 * Authenticated   → /dashboard
 *
 * The loading state prevents a flash while the cookie is being read.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RootPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isLoading, isAuthenticated, router]);

  return null;
}
