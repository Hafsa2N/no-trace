import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

// Deliberately a manual, admin-only action rather than automatic fuzzy
// matching: two courses can share a name without being the same course
// (different content, different department), and merging them wrongly
// silently conflates unrelated feedback. This is for the cases a human has
// actually confirmed are the same course — e.g. a genuinely cross-listed
// course that landed as two records because it was created once per
// department, or a near-duplicate name our exact-match dedup couldn't
// catch (e.g. "DBMS" vs "Database Management Systems").
export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sourceId, targetId } = await req.json();
  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: "sourceId and targetId (different) required" }, { status: 400 });
  }

  const rows = await sql`select id, name, department from courses where id in (${sourceId}, ${targetId})`;
  if (rows.length !== 2) {
    return NextResponse.json({ error: "One or both courses not found" }, { status: 404 });
  }

  await sql`update session_offerings set course_id = ${targetId} where course_id = ${sourceId}`;
  await sql`update updates set course_id = ${targetId} where course_id = ${sourceId}`;
  await sql`delete from courses where id = ${sourceId}`;

  await logAction(session.id, "courses.merged", targetId, { sourceId, targetId });

  return NextResponse.json({ ok: true });
});
