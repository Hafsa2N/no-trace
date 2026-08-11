import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signAdminSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const rows = await sql`
    select id, email, password_hash, role from admins where email = ${email}
  `;
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

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
