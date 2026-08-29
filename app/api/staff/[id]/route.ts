import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

// Deactivate/reactivate a staff account, or reset its password — see
// db/schema.sql for why deactivation is a soft flag rather than a DELETE
// (admins.id is referenced by sessions, session_offerings, updates, and
// audit_log; deleting the row would erase that historical attribution).
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { active, newPassword, name } = await req.json();
  if (typeof active !== "boolean" && !newPassword && name === undefined) {
    return NextResponse.json({ error: "active (boolean), newPassword, or name is required" }, { status: 400 });
  }

  const targetRows = await sql`select id, role, is_active from admins where id = ${id}`;
  const target = targetRows[0];
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (typeof active === "boolean" && !active) {
    if (target.id === session.id) {
      return NextResponse.json({ error: "You can't deactivate your own account while logged in as it" }, { status: 400 });
    }
    if (target.role === "admin") {
      // Without this check, deactivating the last admin would leave the
      // instance with no one able to log in and manage it at all — and
      // unlike a zero-admin fresh deployment, /setup would stay locked
      // (it only checks whether any admin row exists, active or not), so
      // there'd be no way back in short of direct database access.
      const activeAdmins = await sql`select count(*) as count from admins where role = 'admin' and is_active = true`;
      if (Number(activeAdmins[0].count) <= 1) {
        return NextResponse.json({ error: "Can't deactivate the last active admin account" }, { status: 400 });
      }
    }
  }

  if (newPassword) {
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await sql`update admins set password_hash = ${passwordHash} where id = ${id}`;
    await logAction(session.id, "staff.password_reset", id, {});
  }

  if (typeof active === "boolean") {
    await sql`update admins set is_active = ${active} where id = ${id}`;
    await logAction(session.id, active ? "staff.reactivated" : "staff.deactivated", id, {});
  }

  if (name !== undefined) {
    const trimmed = String(name).trim() || null;
    await sql`update admins set name = ${trimmed} where id = ${id}`;
    await logAction(session.id, "staff.name_updated", id, { name: trimmed });
  }

  return NextResponse.json({ ok: true });
});
