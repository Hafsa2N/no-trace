import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signAdminSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { deriveCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";
import { withErrors } from "@/lib/api";

// Bootstraps the very first admin account for a fresh deployment — the
// only way to create an admin without shell access to run
// scripts/create-admin.mjs (e.g. a pure Vercel deploy with no terminal).
// Safe only because of the guard below: the instant one admin exists,
// this endpoint refuses forever. It is never a way to create additional
// admins later — that still requires being logged in already, which this
// route deliberately doesn't grant.

export const GET = withErrors(async () => {
  const rows = await sql`select count(*) as count from admins`;
  const needsSetup = Number(rows[0].count) === 0;
  return NextResponse.json({ needsSetup });
});

export const POST = withErrors(async (req: NextRequest) => {
  const existing = await sql`select count(*) as count from admins`;
  if (Number(existing[0].count) > 0) {
    return NextResponse.json({ error: "Setup has already been completed. Log in normally." }, { status: 403 });
  }

  const { email, password } = await req.json();
  if (!email || !password || String(password).length < 8) {
    return NextResponse.json({ error: "A valid email and a password of at least 8 characters are required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const rows = await sql`
    insert into admins (email, password_hash, role)
    values (${email}, ${passwordHash}, 'admin')
    returning id, email, role
  `;
  const admin = rows[0];

  const token = signAdminSession({ id: admin.id, email: admin.email, role: admin.role });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  res.cookies.set(CSRF_COOKIE_NAME, deriveCsrfToken(token), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
});
