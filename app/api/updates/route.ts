import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

export const GET = withErrors(async (req: NextRequest) => {
  const department = req.nextUrl.searchParams.get("department");
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

  // When a department is given, prefer its most recent department-specific
  // update but fall back to the most recent college-wide one — used to
  // surface "here's what changed" inline in the student flow, not just on
  // the standalone /updates page nobody browses to on their own.
  const rows = department
    ? await sql`
        select id, title, body, department, created_at from updates
        where department = ${department} or department is null
        order by (department is not null) desc, created_at desc
        limit ${limit}
      `
    : await sql`
        select id, title, body, department, created_at from updates order by created_at desc limit ${limit}
      `;

  return NextResponse.json({ updates: rows });
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body, department, courseId } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const rows = await sql`
    insert into updates (title, body, department, course_id, created_by)
    values (${title}, ${body}, ${department || null}, ${courseId || null}, ${session.id})
    returning id
  `;

  await logAction(session.id, "update.posted", rows[0].id, { title, department: department || null, courseId: courseId || null });

  return NextResponse.json({ ok: true, id: rows[0].id });
});
