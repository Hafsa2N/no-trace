import { redirect } from "next/navigation";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles, Download } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getCourseTrends } from "@/lib/analysis/recurringIssues";
import { getCourseResponseRateTrend } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine } from "@/components/ui/TrendLine";
import { buttonClasses } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const DIRECTION_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default async function CourseTrendsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const { id } = await params;
  const trends = await getCourseTrends(id);
  if (!trends) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <p>Course not found.</p>
      </div>
    );
  }

  const { course, terms, themes, totalComments } = trends;
  const unresolvedCount = themes.filter((t) => t.unresolved).length;

  const rateTrend = await getCourseResponseRateTrend(id);
  const rateTrendUsable = rateTrend.filter((p) => p.status === "ok");
  const suppressedTerms = rateTrend.filter((p) => p.status === "suppressed");
  const noDataTerms = rateTrend.filter((p) => p.status === "no_eligible_data");
  const showRateTrend = rateTrendUsable.length > 1;
  const latestRate = rateTrend.length > 0 ? rateTrend[rateTrend.length - 1] : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Courses", href: "/admin/courses" }, { label: course.name }]} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">{course.name}</h1>
          <p className="text-sm text-muted">
            {course.department} · {terms.length} term{terms.length === 1 ? "" : "s"} of data
            {terms.length > 0 ? ` (${terms.join(", ")})` : ""} · {totalComments} comments analyzed
          </p>
        </div>
        {themes.length > 0 && (
          <a href={`/api/courses/${course.id}/export`} className={buttonClasses("secondary", "sm")}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-black uppercase tracking-tight">Course response rate</h2>
              <p className="text-xs text-muted">
                Pooled across every section and faculty who&apos;ve taught {course.name} — total responses ÷
                total eligible students per term, not an average of each section&apos;s own rate.
              </p>
            </div>
            {latestRate && (
              <span className="shrink-0 font-mono text-xs text-muted">
                {latestRate.termName}: {latestRate.status === "ok" ? `${latestRate.rate}%` : "withheld"}
              </span>
            )}
          </div>

          {rateTrend.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No historical data yet — this fills in once a term with this course collects responses.
            </p>
          ) : showRateTrend ? (
            <div className="mt-4">
              <TrendLine
                points={rateTrend.map((p) => ({ label: p.termName, value: p.status === "ok" ? p.rate : null }))}
                tone="primary"
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              {rateTrendUsable.length === 1
                ? "One term available — a trend needs at least two comparable terms."
                : "Historical data withheld for privacy — every term recorded so far has too few eligible students to show a rate without risking re-identification."}
            </p>
          )}

          {/* Every term this course has ever run in, not just the ones the
              chart can plot — so a missing point always has a stated
              reason next to it instead of just disappearing. */}
          {rateTrend.length > 0 && (
            <div className="mt-4 overflow-x-auto border-t border-border pt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1 pr-3 font-medium">Term</th>
                    <th className="py-1 pr-3 font-medium">Sections</th>
                    <th className="py-1 pr-3 text-right font-medium">Responses / eligible</th>
                    <th className="py-1 pr-3 text-right font-medium">Rate</th>
                    <th className="py-1 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rateTrend.map((p) => (
                    <tr key={p.termName}>
                      <td className="py-1.5 pr-3 font-medium text-foreground">{p.termName}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-muted">{p.offeringCount}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-muted">
                        {p.responses} / {p.eligible}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">
                        {p.status === "ok" ? `${p.rate}%` : "—"}
                      </td>
                      <td className="py-1.5">
                        {p.status === "ok" ? (
                          <span className="text-accent">Included</span>
                        ) : p.status === "suppressed" ? (
                          <span title="Fewer than 5 eligible students pooled across every section this term">
                            Withheld · privacy
                          </span>
                        ) : (
                          <span title="No students on the roster match this term's department/year/section">
                            No roster data
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(suppressedTerms.length > 0 || noDataTerms.length > 0) && (
            <p className="mt-3 text-xs text-muted">
              {suppressedTerms.length > 0 &&
                `${suppressedTerms.length} term${suppressedTerms.length === 1 ? "" : "s"} withheld — fewer than 5 eligible students pooled across every section, the same small-cohort threshold used everywhere else in this app.`}
              {suppressedTerms.length > 0 && noDataTerms.length > 0 && " "}
              {noDataTerms.length > 0 &&
                `${noDataTerms.length} term${noDataTerms.length === 1 ? "" : "s"} had sessions for this course but no matching roster data — a data gap, not a privacy suppression.`}
            </p>
          )}
        </CardBody>
      </Card>

      {themes.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-muted">
            {terms.length === 0
              ? "No terms with feedback sessions for this course yet."
              : "Not enough comments yet to detect any themes — each term needs at least 5 visible comments to be included."}
          </CardBody>
        </Card>
      ) : (
        <>
          {unresolvedCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{unresolvedCount}</strong> recurring theme{unresolvedCount === 1 ? "" : "s"} with no
                recorded institutional response.
              </span>
            </div>
          )}

          <div className="space-y-3">
            {themes.map((t) => {
              const DirectionIcon = t.direction ? DIRECTION_ICON[t.direction] : null;
              return (
                <Card key={t.theme}>
                  <CardBody>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="font-medium capitalize">{t.theme}</h2>
                      {t.recurring && <Badge tone="primary">Recurring · {t.termsAppeared} terms</Badge>}
                      {t.unresolved && <Badge tone="warning">⚠ Unresolved</Badge>}
                      {t.deltaPct !== null && DirectionIcon && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            t.direction === "up" ? "text-danger" : t.direction === "down" ? "text-accent" : "text-muted"
                          }`}
                        >
                          <DirectionIcon className="h-3 w-3" />
                          {t.deltaPct > 0 ? "+" : ""}
                          {t.deltaPct}pp
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted">{t.narrative}</p>

                    {t.recurring && t.timeline.some((pt) => !pt.suppressed) && (
                      <div className="mt-4">
                        <TrendLine
                          points={t.timeline.map((pt) => ({ label: pt.termName, value: pt.suppressed ? null : pt.pct }))}
                          tone={t.direction === "up" ? "danger" : t.direction === "down" ? "accent" : "primary"}
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-border px-3.5 py-3 text-xs text-muted">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Generated from a fixed keyword dictionary and term-over-term counts — not a model,
              fully reproducible. "Unresolved" means no update was posted for this specific course
              after the theme first appeared; it doesn't mean nothing was done, only that nothing
              was recorded here.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
