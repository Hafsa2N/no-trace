import { redirect } from "next/navigation";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getCourseTrends } from "@/lib/analysis/recurringIssues";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine } from "@/components/ui/TrendLine";

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{course.name}</h1>
        <p className="text-sm text-muted">
          {course.department} · {terms.length} term{terms.length === 1 ? "" : "s"} of data
          {terms.length > 0 ? ` (${terms.join(", ")})` : ""} · {totalComments} comments analyzed
        </p>
      </div>

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
