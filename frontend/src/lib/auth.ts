/**
 * Browser-safe cookie helpers.
 *
 * All functions guard against SSR by checking `typeof document` before
 * accessing `document.cookie`. Never uses localStorage.
 *
 * Cookie name: "token"
 */

const COOKIE_NAME = "token";

/**
 * Read the auth token from the cookie jar.
 * Returns `null` during SSR or when the cookie is absent.
 */
export function getToken(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * Persist the auth token as a session cookie (no `max-age` → browser session).
 * Uses `SameSite=Strict` and `path=/`.
 *
 * Note: `Secure` is omitted here intentionally — dev runs on HTTP.
 * Add `; Secure` when deploying to HTTPS.
 */
export function setToken(token: string): void {
  if (typeof document === "undefined") return;

  document.cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "path=/",
    "SameSite=Strict",
  ].join("; ");
}

/**
 * Remove the auth token by expiring the cookie immediately.
 */
export function clearToken(): void {
  if (typeof document === "undefined") return;

  document.cookie = [
    `${COOKIE_NAME}=`,
    "path=/",
    "SameSite=Strict",
    "max-age=0",
  ].join("; ");
}

/**
 * Returns `true` if a token cookie is present (non-empty).
 * This is a presence check only — it does NOT verify the JWT signature.
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
