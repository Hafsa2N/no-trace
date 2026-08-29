import { Fragment } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getClassSessionOverview, getOfferingAnalytics } from "@/lib/sessionAnalytics";
import { generateInsights } from "@/lib/insights";
import { PrintButton } from "@/components/PrintButton";
import { McqDistributionList } from "@/components/ui/McqDistributionList";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// The class-level report — one PDF an admin can hand to a department
// meeting covering every subject in this class session at once. Subject-
// level detail (raw responses) lives at the per-offering report; this one
// stays at summary depth per subject so it reads as one coherent document
// rather than a stitched-together stack.
export default async function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const overview = await getClassSessionOverview(id);
  if (!overview) redirect("/admin");

  const visibleOfferings =
    admin.role === "faculty"
      ? overview.offerings.filter((o) => o.assignedFaculty === admin.id && o.resultsPublished)
      : overview.offerings;

  const offeringReports = await Promise.all(
    visibleOfferings.map(async (o) => {
      const analytics = await getOfferingAnalytics(o.id);
      if (!analytics) return null;
      const insights = generateInsights({
        averages: analytics.dimensionAverages,
        sentiment: analytics.analysis ? analytics.analysis.sentiment : null,
        themes: analytics.analysis ? analytics.analysis.themes : {},
        responseCount: analytics.responseCount,
        evidenceLevel: analytics.evidenceLevel,
      });
      return { ...analytics, insights };
    })
  );
  const reports = offeringReports.filter((r): r is NonNullable<typeof r> => r !== null);

  const { session: cls } = overview;
  const generatedAt = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { label: admin.role === "admin" ? "Sessions" : "Your sessions", href: "/admin" },
            { label: `${cls.department} · Y${cls.year} · ${cls.section}`, href: `/admin/sessions/${id}` },
            { label: "Report" },
          ]}
        />
      </div>
      <div className="mb-6 flex items-center justify-end gap-3 print:hidden">
        <PrintButton />
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs uppercase tracking-wide text-muted">Class feedback report</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {cls.department} · Year {cls.year} · Section {cls.section}
        </h1>
        <p className="mt-3 text-xs text-muted">
          Generated {generatedAt} · {reports.length} subject{reports.length === 1 ? "" : "s"}
        </p>
      </header>

      {reports.length === 0 ? (
        <p className="text-sm text-muted">No results available to report on yet.</p>
      ) : (
        <div className="space-y-10">
          {reports.map((r) => {
            const dims = Object.entries(r.averages);
            const ungroupedDims = Object.entries(r.ungroupedAverages);
            const themeEntries = r.analysis ? Object.entries(r.analysis.themes).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]) : [];
            return (
              <section key={r.offering.id} className="break-inside-avoid border-b border-border pb-8 last:border-0">
                <h2 className="mb-1 text-lg font-semibold">{r.offering.courseName}</h2>
                <p className="mb-4 text-xs text-muted">
                  {r.offering.facultyName ?? r.offering.facultyEmail ?? "No faculty assigned"} · {r.responseCount} of {r.eligibleCount} responded
                  {r.responseRate !== null ? ` (${r.responseRate}%)` : ""}
                  {r.evidenceLevel ? ` · ${r.evidenceLevel} evidence` : ""}
                </p>

                {r.insights.length > 0 && (
                  <ul className="mb-4 space-y-1.5">
                    {r.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-foreground">
                        — {insight.text}
                      </li>
                    ))}
                  </ul>
                )}

                {dims.length > 0 && (
                  <table className="mb-4 w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {r.constructs.map((c) => (
                        <Fragment key={c.name}>
                          <tr className="bg-background/60">
                            <td className="py-1 font-medium">
                              {c.name} <span className="font-normal text-muted">({c.items.length} questions)</span>
                            </td>
                            <td className="py-1 text-right font-medium tabular-nums">{c.average.toFixed(2)} / 5</td>
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
                          <td className="py-1 capitalize">{key}</td>
                          <td className="py-1 text-right font-medium tabular-nums">{avg.toFixed(2)} / 5</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {r.mcqDistributions.length > 0 && (
                  <div className="mb-4 space-y-4">
                    {r.mcqDistributions.map((d) => (
                      <McqDistributionList key={d.id} distribution={d} />
                    ))}
                  </div>
                )}

                {themeEntries.length > 0 && (
                  <p className="text-sm text-muted">
                    Recurring themes: {themeEntries.map(([theme, count]) => `${theme} (${count})`).join(" · ")}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Generated from the anonymous academic feedback platform. Identity verification and response
        storage are architecturally separated — no individual response can be traced back to a
        student.
      </footer>
    </div>
  );
}
