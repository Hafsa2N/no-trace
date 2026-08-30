import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { CSRF_COOKIE_NAME } from "@/lib/csrf";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  res.cookies.set(CSRF_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
});
