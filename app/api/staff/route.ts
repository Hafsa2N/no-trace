import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

export const GET = withErrors(async () => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`select id, email, role, created_at from admins order by email`;
  return NextResponse.json({ staff: rows });
});

// Lets an admin create additional admin or faculty accounts through the
// app itself — without this, the only way to add a faculty login is
// shell access to run scripts/create-admin.mjs, which doesn't exist on a
// pure Vercel-style deployment.
export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password, role } = await req.json();
  if (!email || !password || String(password).length < 8) {
    return NextResponse.json({ error: "A valid email and a password of at least 8 characters are required" }, { status: 400 });
  }
  if (role !== "admin" && role !== "faculty") {
    return NextResponse.json({ error: "role must be admin or faculty" }, { status: 400 });
  }

  const existing = await sql`select id from admins where email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const rows = await sql`
    insert into admins (email, password_hash, role)
    values (${email}, ${passwordHash}, ${role})
    returning id, email, role
  `;

  await logAction(session.id, "staff.created", rows[0].id, { email, role });

  return NextResponse.json({ ok: true, staff: rows[0] });
});
