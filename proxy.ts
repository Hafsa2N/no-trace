import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { deriveCsrfToken, csrfTokensMatch, CSRF_HEADER_NAME } from "@/lib/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Centralized double-submit-cookie CSRF enforcement for every staff-authenticated
// mutation. Runs ahead of each route's own handler, so no individual API route
// can forget it. Anonymous/pre-auth flows (OTP, feedback submission, my-data
// self-service, login, first-run setup) never carry the admin_session cookie
// and are correctly left unchecked here — see the deriveCsrfToken comment.
export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const sessionToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionToken) return NextResponse.next();

  const expected = deriveCsrfToken(sessionToken);
  const provided = request.headers.get(CSRF_HEADER_NAME) ?? "";
  if (!provided || !csrfTokensMatch(provided, expected)) {
    return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
