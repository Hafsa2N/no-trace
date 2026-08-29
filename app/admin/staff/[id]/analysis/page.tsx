import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getFacultyAnalysis } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// The faculty-wide counterpart to the class-wide analysis card — "how is
// this person doing across everything they teach," ranked so the
// strongest and weakest courses surface immediately instead of requiring
// an admin to open every session one at a time.
export default async function FacultyAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "admin") redirect("/admin");

  const { id } = await params;
  const facultyRows = await sql`select id, email, name from admins where id = ${id} and role = 'faculty'`;
  const faculty = facultyRows[0];
  if (!faculty) redirect("/admin/staff");

  const { offerings, overallAverage, totalResponses, strongest, weakest } = await getFacultyAnalysis(id);
  const taught = offerings.filter((o) => o.average !== null);
  const untaught = offerings.filter((o) => o.average === null);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Staff", href: "/admin/staff" }, { label: faculty.name || faculty.email }]} />
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">{faculty.name || faculty.email}</h1>
        {faculty.name && <p className="text-xs text-muted">{faculty.email}</p>}
        <p className="mt-1 text-sm text-muted">Performance across every subject and term assigned to them</p>
      </div>

      {overallAverage === null ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-muted">No responses recorded for this faculty member yet.</CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="grid grid-cols-2 divide-x divide-border sm:grid-cols-3">
              <div className="px-4 py-1 first:pl-0">
                <p className="text-xs text-muted">Overall average</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{overallAverage} / 5</p>
              </div>
              <div className="px-4 py-1">
                <p className="text-xs text-muted">Total responses</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{totalResponses}</p>
              </div>
              <div className="col-span-2 px-4 py-1 sm:col-span-1">
                <p className="text-xs text-muted">Subjects taught</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{taught.length}</p>
              </div>
            </CardBody>
          </Card>

          {strongest && weakest && strongest.offeringId !== weakest.offeringId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardBody className="flex items-start gap-2.5">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-xs text-muted">Strongest</p>
                    <p className="text-sm font-medium">{strongest.courseName}</p>
                    <p className="text-xs text-muted">{strongest.average} / 5 · {strongest.department} Y{strongest.year}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-start gap-2.5">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div>
                    <p className="text-xs text-muted">Needs attention</p>
                    <p className="text-sm font-medium">{weakest.courseName}</p>
                    <p className="text-xs text-muted">{weakest.average} / 5 · {weakest.department} Y{weakest.year}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-medium">All subjects</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2 font-medium">Subject</th>
                    <th className="px-4 py-2 font-medium">Term</th>
                    <th className="px-4 py-2 text-right font-medium">Responses</th>
                    <th className="px-4 py-2 text-right font-medium">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {taught.map((o) => (
                    <tr key={o.offeringId}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {o.courseName}
                        <p className="text-xs font-normal text-muted">
                          {o.department} · Y{o.year} · {o.section}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted">{o.termName ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{o.responseCount}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{o.average} / 5</td>
                    </tr>
                  ))}
                  {untaught.map((o) => (
                    <tr key={o.offeringId} className="text-muted">
                      <td className="px-4 py-3">
                        {o.courseName}
                        <p className="text-xs font-normal">
                          {o.department} · Y{o.year} · {o.section}
                        </p>
                      </td>
                      <td className="px-4 py-3">{o.termName ?? "—"}</td>
                      <td className="px-4 py-3 text-right">0</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone="neutral">No responses</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
