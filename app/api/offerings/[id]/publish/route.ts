import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

// Admin-only: release (or withdraw) a subject's results to the faculty
// assigned to it. Deliberately per-offering, not per-session — a class
// session covers several subjects, and an admin may want to release one
// faculty's results before another's.
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { published } = await req.json();
  if (typeof published !== "boolean") {
    return NextResponse.json({ error: "published (boolean) is required" }, { status: 400 });
  }

  const rows = await sql`
    update session_offerings set results_published = ${published} where id = ${id}
    returning id, assigned_faculty
  `;
  if (!rows[0]) return NextResponse.json({ error: "Offering not found" }, { status: 404 });

  await logAction(admin.id, published ? "results.published" : "results.unpublished", id, {
    assignedFaculty: rows[0].assigned_faculty,
  });

  return NextResponse.json({ ok: true });
});
