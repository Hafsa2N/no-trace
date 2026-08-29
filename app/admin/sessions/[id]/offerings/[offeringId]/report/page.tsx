import { Fragment } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { getOfferingAnalytics } from "@/lib/sessionAnalytics";
import { generateInsights } from "@/lib/insights";
import { PrintButton } from "@/components/PrintButton";
import { McqDistributionList } from "@/components/ui/McqDistributionList";
import { buttonClasses } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function OfferingReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; offeringId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id, offeringId } = await params;
  const { mode } = await searchParams;
  const detailed = mode === "detailed";

  const analytics = await getOfferingAnalytics(offeringId);
  if (!analytics) redirect(`/admin/sessions/${id}`);

  if (admin.role === "faculty" && analytics.offering.assignedFaculty !== admin.id) redirect("/admin");
  if (admin.role === "faculty" && !analytics.offering.resultsPublished) redirect(`/admin/sessions/${id}/offerings/${offeringId}`);

  const {
    offering,
    responseCount,
    eligibleCount,
    responseRate,
    evidenceLevel,
    averages,
    commentsWithheld,
    minResponsesForComments,
    analysis,
    rawResponses,
    mcqDistributions,
    extraTextAnswers,
    constructs,
    ungroupedAverages,
    dimensionAverages,
  } = analytics;

  const insights = generateInsights({
    averages: dimensionAverages,
    sentiment: analysis ? analysis.sentiment : null,
    themes: analysis ? analysis.themes : {},
    responseCount,
    evidenceLevel,
  });

  const generatedAt = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const dims = Object.entries(averages);
  const ungroupedDims = Object.entries(ungroupedAverages);
  const themeEntries = analysis ? Object.entries(analysis.themes).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="print:hidden">
        <Breadcrumbs
          items={
            admin.role === "admin"
              ? [
                  { label: "Sessions", href: "/admin" },
                  { label: `${offering.department} · Y${offering.year} · ${offering.section}`, href: `/admin/sessions/${id}` },
                  { label: offering.courseName, href: `/admin/sessions/${id}/offerings/${offeringId}` },
                  { label: "Report" },
                ]
              : [
                  { label: "Your sessions", href: "/admin" },
                  { label: offering.courseName, href: `/admin/sessions/${id}/offerings/${offeringId}` },
                  { label: "Report" },
                ]
          }
        />
      </div>
      <div className="mb-6 flex items-center justify-end gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/sessions/${id}/offerings/${offeringId}/report?mode=${detailed ? "summary" : "detailed"}`}
            className={buttonClasses("secondary", "sm")}
          >
            {detailed ? "Switch to summary" : "Switch to detailed"}
          </Link>
          <PrintButton />
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs uppercase tracking-wide text-muted">
          {detailed ? "Detailed feedback report" : "Feedback report"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{offering.courseName}</h1>
        <p className="mt-1 text-sm text-muted">
          {offering.department} · Year {offering.year} · Section {offering.section}
          {offering.facultyEmail ? ` · ${offering.facultyName ?? offering.facultyEmail}` : ""}
        </p>
        <p className="mt-3 text-xs text-muted">
          Generated {generatedAt} · {responseCount} of {eligibleCount} eligible students responded
          {responseRate !== null ? ` (${responseRate}%)` : ""}
          {evidenceLevel ? ` · ${evidenceLevel} evidence` : ""}
        </p>
      </header>

      {insights.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Key insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-foreground">
                — {insight.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dims.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Ratings by dimension</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-1.5 font-medium">Dimension</th>
                <th className="py-1.5 text-right font-medium">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {constructs.map((c) => (
                <Fragment key={c.name}>
                  <tr className="bg-background/60">
                    <td className="py-1.5 font-medium">
                      {c.name} <span className="font-normal text-muted">({c.items.length} questions)</span>
                    </td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{c.average.toFixed(2)} / 5</td>
                  </tr>
                  {c.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1 pl-4 text-xs text-muted">{item.label}</td>
                      <td className="py-1 text-right text-xs tabular-nums text-muted">{item.average.toFixed(2)} / 5</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {ungroupedDims.map(([key, avg]) => (
                <tr key={key}>
                  <td className="py-1.5 capitalize">{key}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{avg.toFixed(2)} / 5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {mcqDistributions.length > 0 && (
        <section className="mb-8 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Multiple choice</h2>
          {mcqDistributions.map((d) => (
            <McqDistributionList key={d.id} distribution={d} />
          ))}
        </section>
      )}

      {analysis && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Comment sentiment</h2>
          <p className="text-sm text-foreground">
            {analysis.sentiment.positive} positive · {analysis.sentiment.neutral} neutral · {analysis.sentiment.negative} negative
            <span className="text-muted"> (scored with a fixed lexicon, AFINN-165)</span>
          </p>
        </section>
      )}

      {themeEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recurring themes</h2>
          <p className="text-sm text-foreground">
            {themeEntries.map(([theme, count]) => `${theme} (${count})`).join(" · ")}
          </p>
        </section>
      )}

      {analysis && analysis.highlights.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Representative comments</h2>
          <ul className="space-y-2">
            {analysis.highlights.map((c, i) => (
              <li key={i} className="border-l-2 border-border pl-3 text-sm italic text-foreground">
                &ldquo;{c}&rdquo;
              </li>
            ))}
          </ul>
        </section>
      )}

      {extraTextAnswers.map((extra) => (
        <section key={extra.id} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{extra.label}</h2>
          {extra.texts.length === 0 ? (
            <p className="text-sm text-muted">
              {commentsWithheld ? `Withheld until ${minResponsesForComments} responses` : "No answers yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {extra.texts.map((text, i) => (
                <li key={i} className="border-l-2 border-border pl-3 text-sm text-foreground">
                  {text}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {detailed && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            All individual responses ({rawResponses.length})
          </h2>
          <p className="mb-3 text-xs text-muted">
            Responses are never linked to a student identity anywhere in the system — this list is
            exactly as anonymous as the summary above, just unaggregated.
          </p>
          {rawResponses.length === 0 ? (
            <p className="text-sm text-muted">No responses yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-1.5 pr-3 font-medium">#</th>
                    {dims.map(([key]) => (
                      <th key={key} className="py-1.5 pr-3 text-right font-medium capitalize">
                        {key}
                      </th>
                    ))}
                    {mcqDistributions.map((d) => (
                      <th key={d.id} className="py-1.5 pr-3 text-left font-medium">
                        {d.label}
                      </th>
                    ))}
                    <th className="py-1.5 pr-3 font-medium">Comment</th>
                    {extraTextAnswers.map((extra) => (
                      <th key={extra.id} className="py-1.5 pr-3 font-medium">
                        {extra.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border align-top">
                  {rawResponses.map((r, i) => (
                    <tr key={r.id}>
                      <td className="py-1.5 pr-3 text-muted">{i + 1}</td>
                      {dims.map(([key]) => (
                        <td key={key} className="py-1.5 pr-3 text-right tabular-nums">
                          {r.ratings[key] ?? "—"}
                        </td>
                      ))}
                      {mcqDistributions.map((d) => (
                        <td key={d.id} className="py-1.5 pr-3 text-left">
                          {(r.ratings[d.id] as string | undefined) ?? "—"}
                        </td>
                      ))}
                      <td className="py-1.5 pr-3 text-foreground">
                        {commentsWithheld
                          ? `Withheld until ${minResponsesForComments} responses`
                          : r.comment ?? <span className="text-muted">—</span>}
                      </td>
                      {extraTextAnswers.map((extra) => (
                        <td key={extra.id} className="py-1.5 pr-3 text-foreground">
                          {commentsWithheld
                            ? `Withheld until ${minResponsesForComments} responses`
                            : (r.ratings[extra.id] as string | undefined) ?? <span className="text-muted">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Generated from the anonymous academic feedback platform. Identity verification and response
        storage are architecturally separated — no individual response can be traced back to a
        student.
      </footer>
    </div>
  );
}
