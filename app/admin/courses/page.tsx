import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { MergeCoursesForm } from "@/components/MergeCoursesForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyCoursesIllustration } from "@/components/ui/illustrations/EmptyCourses";

export default async function CoursesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  // course_id lives on session_offerings (one per subject), not on
  // sessions directly — same join pattern as getCourseTrends(). Response
  // rate here is summed across every offering of this course, across every
  // section/term it's been taught in — the "how is this subject doing
  // college-wide" number, distinct from one section's rate on its own
  // session page.
  const courses = await sql`
    select c.id, c.name, c.department,
           count(distinct s.term_id) as term_count,
           count(distinct s.id) as session_count,
           coalesce(sum((select count(*) from responses r where r.session_offering_id = so.id)), 0) as total_responses,
           coalesce(sum((select count(*) from students st
                         where st.department = s.department and st.year = s.year and st.section = s.section)), 0) as total_eligible
    from courses c
    left join session_offerings so on so.course_id = c.id
    left join sessions s on s.id = so.session_id
    group by c.id, c.name, c.department
    order by c.department, c.name
  `;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Courses</h1>
        <p className="text-sm text-muted">Cross-semester feedback trends, by course</p>
      </div>

      <MergeCoursesForm courses={courses.map((c) => ({ id: c.id, name: c.name, department: c.department }))} />

      {courses.length === 0 ? (
        <EmptyState
          illustration={<EmptyCoursesIllustration />}
          title="No courses yet"
          description="Courses are created automatically the first time you make a feedback session for them."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2 font-medium">
                  Course
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Department
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Response rate
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Terms tracked
                </th>
                <th scope="col" className="w-8 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {courses.map((c) => {
                const eligible = Number(c.total_eligible);
                const responses = Number(c.total_responses);
                // Suppressed below 5 eligible students — same threshold as
                // the department rollup and the small-N comment gate, so a
                // course taught to a tiny section doesn't show an exact
                // rate that's re-identifying alongside a known roster.
                const rate = eligible >= 5 ? Math.round((responses / eligible) * 100) : null;
                const tooFewEligible = eligible > 0 && eligible < 5;
                return (
                  <tr key={c.id} className="relative transition-colors hover:bg-background">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link href={`/admin/courses/${c.id}`} className="after:absolute after:inset-0">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.department}</td>
                    <td className="px-4 py-3">
                      {rate === null ? (
                        <span className="text-muted" title={tooFewEligible ? "Too few eligible students to show a rate without risking re-identification" : undefined}>
                          {tooFewEligible ? "Not enough data" : "—"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-1.5 w-20 overflow-hidden rounded-full bg-border"
                            role="img"
                            aria-label={`${rate}% response rate`}
                          >
                            <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="tabular-nums text-foreground">{rate}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {c.term_count} term{c.term_count === "1" ? "" : "s"}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}
