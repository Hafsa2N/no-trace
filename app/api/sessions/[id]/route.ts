import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

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

// Deletes a session outright — but only if it has zero recorded responses.
// A session with real feedback in it is never deletable, full stop: that
// would destroy actual anonymous submissions, which is exactly the data
// this whole app exists to protect. This exists for the much narrower,
// very real case of cleaning up a mistake (wrong class, wrong term) before
// anyone has actually used it — not for closing out a real session.
export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sessionRows = await sql`select id from sessions where id = ${id}`;
  if (!sessionRows[0]) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const responseCountRows = await sql`
    select count(*) as count from responses r
    join session_offerings so on so.id = r.session_offering_id
    where so.session_id = ${id}
  `;
  const responseCount = Number(responseCountRows[0].count);
  if (responseCount > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${responseCount} response${responseCount === 1 ? "" : "s"} already recorded for this session.` },
      { status: 409 }
    );
  }

  await sql`delete from tokens where session_id = ${id}`;
  await sql`delete from otp_codes where session_id = ${id}`;
  await sql`delete from session_participants where session_id = ${id}`;
  await sql`delete from session_offerings where session_id = ${id}`;
  await sql`delete from sessions where id = ${id}`;

  await logAction(admin.id, "session.deleted", id, {});

  return NextResponse.json({ ok: true });
});
