import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { withErrors } from "@/lib/api";

// Public endpoint — students hit this before verifying, so it must never
// return anything beyond what's needed to render the entry form. No
// faculty identity here — just subject names, one per offering in this
// class session.
export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const rows = await sql`
    select id, department, year, section, questions, opens_at, closes_at
    from sessions where id = ${id}
  `;
  const session = rows[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const offeringRows = await sql`
    select so.id, c.name as course_name
    from session_offerings so
    left join courses c on c.id = so.course_id
    where so.session_id = ${id}
    order by c.name
  `;

  const now = new Date();
  const status =
    now < new Date(session.opens_at) ? "not_open" : now > new Date(session.closes_at) ? "closed" : "open";

  return NextResponse.json({
    id: session.id,
    department: session.department,
    year: session.year,
    section: session.section,
    questions: session.questions,
    offerings: offeringRows.map((o) => ({ id: o.id, subject: o.course_name ?? "(untitled subject)" })),
    status,
    closesAt: session.closes_at,
  });
});
