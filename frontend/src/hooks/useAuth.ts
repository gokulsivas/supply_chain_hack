"use client";

/**
 * useAuth — client-only authentication state hook.
 *
 * - Reads cookie presence to determine `isAuthenticated`.
 * - Does NOT decode or trust a JWT for authorization decisions.
 * - Does NOT navigate automatically — callers decide what to do.
 * - Provides `logout()` which clears the token cookie.
 */

import { useCallback, useSyncExternalStore } from "react";
import { clearToken, getToken } from "@/lib/auth";

// ── External cookie store ─────────────────────────────────────────
// useSyncExternalStore requires a subscribe function. Because cookie
// changes happen imperatively (setToken / clearToken), we use a simple
// notify pattern: callers dispatch a CustomEvent and the store listens.

const AUTH_EVENT = "auth:change";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

/** Read token from cookie — used by useSyncExternalStore on the client. */
function getSnapshot(): boolean {
  return getToken() !== null;
}

/** Server snapshot: always unauthenticated (no document during SSR). */
function getServerSnapshot(): boolean {
  return false;
}

/** Notify the store that the auth cookie has changed. */
export function notifyAuthChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

// ── Hook ──────────────────────────────────────────────────────────

interface AuthState {
  /** True if a token cookie is present (presence check, not verification). */
  isAuthenticated: boolean;
  /**
   * Always false — kept for API compatibility with callers that may check
   * a loading state. useSyncExternalStore is synchronous so there is no
   * async loading phase.
   */
  isLoading: boolean;
  /** Clear the token cookie and notify subscribers. */
  logout: () => void;
}

export function useAuth(): AuthState {
  const isAuthenticated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const logout = useCallback(() => {
    clearToken();
    notifyAuthChange();
  }, []);

  return {
    isLoading: false,
    isAuthenticated,
    logout,
  };
}
