import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signAdminSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { checkRateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { logAction } from "@/lib/audit";

export const POST = withErrors(async (req: NextRequest) => {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Same dual per-account + per-IP shape as every other auth endpoint here
  // (OTP request, forgot-password) — this one was the sole exception,
  // leaving password guessing against any admin/faculty account
  // unthrottled. Per-account first: an attacker cycling passwords against
  // one known email is the real threat; per-IP is the looser backstop
  // against someone cycling through many emails from one place.
  const okAccount = await checkRateLimit(`admin-login:${String(email).trim().toLowerCase()}`, 5, 15 * 60);
  const okIp = await checkRateLimit(`admin-login-ip:${clientIp(req)}`, 30, 60 * 60);
  if (!okAccount || !okIp) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const rows = await sql`
    select id, email, password_hash, role, is_active from admins where email = ${email}
  `;
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    // Logged even when the email doesn't match any account (actor_id null)
    // — the audit trail is what actually surfaces credential-stuffing
    // attempts against staff accounts, not just the rate limiter silently
    // absorbing them.
    await logAction(admin?.id ?? null, "auth.login_failed", undefined, { email: String(email).trim().toLowerCase() });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!admin.is_active) {
    // Deliberately the same generic message as a wrong password — telling
    // an unauthenticated caller "this specific account was deactivated"
    // would confirm the account's existence to anyone probing emails. The
    // audit log itself can be more specific since only admins read it.
    await logAction(admin.id, "auth.login_failed", undefined, { reason: "deactivated" });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await logAction(admin.id, "auth.login_succeeded");

  const token = signAdminSession({ id: admin.id, email: admin.email, role: admin.role });
  const res = NextResponse.json({ ok: true, role: admin.role });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
});
