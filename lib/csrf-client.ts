"use client";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Header object to spread into a mutating fetch() from an authenticated
 * staff page. Empty when there's no session yet (login itself, or a
 * pre-auth/public flow) — the proxy only enforces this for requests that
 * already carry the admin_session cookie, so those calls need nothing here.
 */
export function csrfHeaders(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE_NAME);
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}
