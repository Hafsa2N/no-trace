import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

// Bulk variant of /api/offerings/[id]/publish — lets an admin release (or
// withdraw) several subjects' results to their faculty in one action
// instead of clicking into each subject individually.
export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { offeringIds, published } = await req.json();
  if (!Array.isArray(offeringIds) || offeringIds.length === 0 || typeof published !== "boolean") {
    return NextResponse.json({ error: "offeringIds (non-empty array) and published (boolean) are required" }, { status: 400 });
  }

  const rows = await sql`
    update session_offerings set results_published = ${published}
    where session_id = ${id} and id = any(${offeringIds})
    returning id, assigned_faculty
  `;

  for (const row of rows) {
    await logAction(admin.id, published ? "results.published" : "results.unpublished", row.id as string, {
      assignedFaculty: row.assigned_faculty,
      bulk: true,
    });
  }

  return NextResponse.json({ ok: true, updated: rows.length });
});
