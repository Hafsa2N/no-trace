import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";

// Every distinct department/year/section combination actually present in
// the roster, with how many students are in each — powers both the
// department autosuggest and the live "N students match this class"
// check on session creation. Fetched once when the form loads rather than
// re-queried per keystroke; the roster is small enough (a few hundred
// rows at most for one college) that this is cheap either way.
export const GET = withErrors(async () => {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    select department, year, section, count(*) as count
    from students
    group by department, year, section
    order by department, year, section
  `;

  return NextResponse.json({
    classes: rows.map((r) => ({
      department: r.department,
      year: Number(r.year),
      section: r.section,
      count: Number(r.count),
    })),
  });
});
