import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";

// Self-service password change for any logged-in staff account (admin or
// faculty) — distinct from the admin-only reset in /api/staff/[id], which
// exists for the "forgot my password entirely" case. This one requires
// proving you know the current password, same as any account settings page.
export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const rows = await sql`select password_hash from admins where id = ${session.id}`;
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await sql`update admins set password_hash = ${passwordHash} where id = ${session.id}`;

  return NextResponse.json({ ok: true });
});
