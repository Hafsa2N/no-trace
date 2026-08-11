import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { resolveCourseId } from "@/lib/courses";

export const GET = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const department = req.nextUrl.searchParams.get("department");
  const rows = department
    ? await sql`select id, name, department from courses where department = ${department} order by name`
    : await sql`select id, name, department from courses order by department, name`;

  return NextResponse.json({ courses: rows });
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, department } = await req.json();
  if (!name || !department) {
    return NextResponse.json({ error: "name and department required" }, { status: 400 });
  }

  // Genuine synonyms ("DBMS" vs "Database Management Systems") still need
  // a human to notice and merge — no naming scheme can catch that
  // automatically. This only dedups exact-ish (case/whitespace) variants.
  const id = await resolveCourseId(name, department);
  const rows = await sql`select id, name, department from courses where id = ${id}`;
  return NextResponse.json({ ok: true, course: rows[0] });
});
