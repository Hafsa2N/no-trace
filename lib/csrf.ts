import { createHmac, timingSafeEqual } from "crypto";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — see .env.example");
  return s;
}

/**
 * Double-submit-cookie CSRF defense, derived from the session JWT itself —
 * no separate server-side store, and the token is automatically invalidated
 * whenever the session is (logout, expiry, a new login issuing a new JWT).
 * A cross-site form can make the browser attach cookies, but it can neither
 * read this cookie's value (different origin) nor attach a custom header,
 * so it can't reproduce the header this function's output is checked against.
 */
export function deriveCsrfToken(sessionToken: string): string {
  return createHmac("sha256", secret()).update(sessionToken).digest("hex");
}

export function csrfTokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
