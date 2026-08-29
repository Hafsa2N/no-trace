import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";

// Backs "duplicate this session for a new term" — returns just the
// class/subject shape (department, year, section, subjects + faculty),
// never opens_at/closes_at/term. Those are deliberately not copied: a new
// run always needs its own dates and passcode, and blindly carrying over
// last term's window would be a footgun (a session that looks "new" but
// is already closed, or opens at the wrong time).
export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sessionRows = await sql`select department, year, section from sessions where id = ${id}`;
  const cls = sessionRows[0];
  if (!cls) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const offeringRows = await sql`
    select c.name as subject, so.assigned_faculty as assigned_faculty
    from session_offerings so
    left join courses c on c.id = so.course_id
    where so.session_id = ${id}
    order by c.name
  `;

  return NextResponse.json({
    department: cls.department,
    year: cls.year,
    section: cls.section,
    offerings: offeringRows.map((o) => ({ subject: o.subject ?? "", assignedFaculty: o.assigned_faculty ?? "" })),
  });
});
