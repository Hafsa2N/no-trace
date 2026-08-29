import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquareText, Users, Lock, Sparkles, Clock, Lightbulb, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getOfferingAnalytics, getFacultyCourseTrend, getCourseTermTrend } from "@/lib/sessionAnalytics";
import { generateInsights } from "@/lib/insights";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ModeratedComment } from "@/components/ModeratedComment";
import { HiddenCommentsReview } from "@/components/HiddenCommentsReview";
import { SentimentDonut } from "@/components/ui/SentimentDonut";
import { McqDistributionList } from "@/components/ui/McqDistributionList";
import { RatingsBreakdown } from "@/components/ui/RatingsBreakdown";
import { TrendLine } from "@/components/ui/TrendLine";
import { PublishResultsButton } from "@/components/PublishResultsButton";
import { buttonClasses } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function OfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string; offeringId: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id, offeringId } = await params;
  const analytics = await getOfferingAnalytics(offeringId);
  if (!analytics) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <p>Subject not found.</p>
      </div>
    );
  }

  // Faculty can only ever open an offering assigned to them — not a
  // colleague's subject in the same class session.
  if (admin.role === "faculty" && analytics.offering.assignedFaculty !== admin.id) {
    redirect("/admin");
  }

  // Admin controls when faculty can see results — a real institutional
  // workflow (review before a department meeting, rather than faculty
  // watching live results trickle in). This check happens before any
  // analytics are computed into the response for a faculty viewer, not
  // just hidden in the UI — nothing below this point is faculty-visible
  // until published.
  if (admin.role === "faculty" && !analytics.offering.resultsPublished) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
          <Clock className="h-5 w-5" />
        </span>
        <p className="font-medium">Results not shared yet</p>
        <p className="mt-1.5 text-sm text-muted">
          {analytics.offering.courseName} — your admin hasn&apos;t released these results yet. You&apos;ll
          see them here once they do.
        </p>
      </div>
    );
  }

  const {
    offering,
    responseCount,
    eligibleCount,
    responseRate,
    evidenceLevel,
    averages,
    commentRecords,
    hiddenCommentCount,
    hiddenCommentRecords,
    commentsWithheld,
    minResponsesForComments,
    analysis,
    mcqDistributions,
    extraTextAnswers,
    constructs,
    ungroupedAverages,
    dimensionAverages,
  } = analytics;

  const sentimentTotal = analysis ? analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative : 0;
  const topThemes = analysis
    ? Object.entries(analysis.themes)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  // Only shown once there's genuinely more than one term of data — a
  // single point isn't a trend, it's a restated current score. Faculty see
  // their own trajectory teaching this course; admins see the course's
  // trend across every section and faculty who've taught it — different
  // questions, so a different query for each, not the same data reframed.
  const facultyTrend = admin.role === "faculty" ? await getFacultyCourseTrend(offering.courseId, offering.assignedFaculty, offering.id) : [];
  const courseTrend = admin.role === "admin" ? await getCourseTermTrend(offering.courseId) : [];
  const trend = admin.role === "faculty" ? facultyTrend : courseTrend;
  const showTrend = trend.length > 1;

  const insights = generateInsights({
    averages: dimensionAverages,
    sentiment: analysis ? analysis.sentiment : null,
    themes: analysis ? analysis.themes : {},
    responseCount,
    evidenceLevel,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <Breadcrumbs
        items={
          admin.role === "admin"
            ? [
                { label: "Sessions", href: "/admin" },
                { label: `${offering.department} · Y${offering.year} · ${offering.section}`, href: `/admin/sessions/${id}` },
                { label: offering.courseName },
              ]
            : [
                { label: "Your sessions", href: "/admin" },
                { label: offering.courseName },
              ]
        }
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-black uppercase tracking-tight">{offering.courseName}</h1>
            {admin.role === "admin" && (
              <Badge tone={offering.resultsPublished ? "success" : "neutral"}>
                {offering.resultsPublished ? "Shared with faculty" : "Not shared yet"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            {offering.department} · Year {offering.year} · Section {offering.section}
            {admin.role === "admin" && offering.facultyEmail ? ` · ${offering.facultyName ?? offering.facultyEmail}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/admin/sessions/${id}/offerings/${offeringId}/report`} className={buttonClasses("secondary", "sm")}>
            <FileText className="h-3.5 w-3.5" />
            Report
          </Link>
          {admin.role === "admin" && offering.assignedFaculty && (
            <PublishResultsButton offeringId={offering.id} published={offering.resultsPublished} />
          )}
        </div>
      </div>

      {/* At a glance: the response-rate reading, its evidence, and the trend
          (if one exists) share one instrument instead of being three
          separate cards the reader has to mentally recombine themselves. */}
      <Card className="overflow-hidden">
        <div className={`flex flex-col ${showTrend ? "lg:flex-row lg:divide-x lg:divide-border" : ""}`}>
          <div className="flex-1 px-5 py-5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <p className="font-display text-5xl font-black tabular-nums leading-none text-foreground">
                {responseRate !== null ? `${responseRate}%` : "—"}
              </p>
              {evidenceLevel && (
                <Badge
                  tone={evidenceLevel === "high" ? "success" : evidenceLevel === "moderate" ? "warning" : "neutral"}
                  title="Based on response-rate thresholds from course-evaluation research, not a calculated statistical confidence interval."
                >
                  {evidenceLevel === "high" ? "Strong evidence" : evidenceLevel === "moderate" ? "Some evidence" : "Limited evidence"}
                </Badge>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Response rate</p>
            <p className="mt-1 text-xs text-muted">{responseCount} of {eligibleCount} eligible students responded</p>
            {evidenceLevel === "low" && responseCount > 0 && (
              <p className="mt-3 text-xs text-muted">
                Under 40% — research on course evaluations finds this level shows significantly
                different (usually lower) scores than 50–75% response rates. Treat these averages
                as directional, not representative of the whole class.
              </p>
            )}
            {evidenceLevel === "moderate" && (
              <p className="mt-3 text-xs text-muted">
                Under the ~66% threshold generally considered reliable for course evaluations —
                some sampling bias is likely.
              </p>
            )}
          </div>
          {showTrend && (
            <div className="flex-1 px-5 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {admin.role === "faculty" ? "Your trend for this course" : "This course, by term"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {admin.role === "faculty"
                  ? "Average rating across terms you've taught it — a trajectory, not a scorecard."
                  : "Average rating across every section and faculty who've taught it."}
              </p>
              <div className="mt-3">
                <TrendLine points={trend} tone="accent" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted" />
              <h2 className="font-display text-lg font-black uppercase tracking-tight">Key insights</h2>
            </div>
            <ul className="space-y-2.5">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {insight.tone === "concern" ? (
                    <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  ) : insight.tone === "positive" ? (
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                  )}
                  <span className="text-foreground">{insight.text}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="font-display text-lg font-black uppercase tracking-tight">Question-level results</h2>
        </div>
        {Object.keys(averages).length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-muted">No responses yet.</CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <RatingsBreakdown constructs={constructs} ungroupedAverages={ungroupedAverages} responseCount={responseCount} />
            </CardBody>
          </Card>
        )}
      </div>

      {(mcqDistributions.length > 0 || (analysis && sentimentTotal > 0) || topThemes.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {mcqDistributions.length > 0 && (
            <div className="sm:col-span-2">
              <h2 className="mb-3 font-display text-lg font-black uppercase tracking-tight">Multiple choice</h2>
              <Card>
                <CardBody className="space-y-5">
                  {mcqDistributions.map((d) => (
                    <McqDistributionList key={d.id} distribution={d} />
                  ))}
                </CardBody>
              </Card>
            </div>
          )}

          {analysis && sentimentTotal > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-black uppercase tracking-tight">Sentiment</h2>
              <Card>
                <CardBody>
                  <SentimentDonut
                    positive={analysis.sentiment.positive}
                    neutral={analysis.sentiment.neutral}
                    negative={analysis.sentiment.negative}
                  />
                  <p className="mt-4 text-xs text-muted">
                    Scored with a fixed word-lexicon (AFINN-165), not a model — deterministic and
                    re-checkable by hand.
                  </p>
                </CardBody>
              </Card>
            </div>
          )}

          {topThemes.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-black uppercase tracking-tight">Common themes</h2>
              <Card>
                <CardBody className="flex flex-wrap content-start gap-2">
                  {topThemes.map(([theme, count]) => (
                    <Badge key={theme} tone="primary">
                      {theme} · {count}
                    </Badge>
                  ))}
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      {analysis && analysis.highlights.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted" />
            <h2 className="font-display text-lg font-black uppercase tracking-tight">Most representative comments</h2>
          </div>
          <div className="space-y-2">
            {analysis.highlights.map((c, i) => (
              <Card key={i}>
                <CardBody className="text-sm">{c}</CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted" />
          <h2 className="font-display text-lg font-black uppercase tracking-tight">All comments</h2>
          {hiddenCommentCount > 0 && admin.role !== "admin" && (
            <span className="text-xs text-muted">({hiddenCommentCount} hidden by staff)</span>
          )}
        </div>
        {admin.role === "admin" && <HiddenCommentsReview records={hiddenCommentRecords} />}
        {commentsWithheld ? (
          <Card>
            <CardBody className="flex items-start gap-2.5 text-sm text-muted">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Withheld until at least {minResponsesForComments} students have responded, so no
                comment can be attributed by elimination. ({responseCount}/{minResponsesForComments} so far)
              </span>
            </CardBody>
          </Card>
        ) : commentRecords.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-muted">No comments yet.</CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {commentRecords.map((c) => (
              <ModeratedComment key={c.id} id={c.id} text={c.text} />
            ))}
          </div>
        )}
      </div>

      {extraTextAnswers.map((extra) => (
        <div key={extra.id}>
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted" />
            <h2 className="font-display text-lg font-black uppercase tracking-tight">{extra.label}</h2>
          </div>
          {commentsWithheld ? (
            <Card>
              <CardBody className="flex items-start gap-2.5 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Withheld until at least {minResponsesForComments} students have responded, so no
                  answer can be attributed by elimination. ({responseCount}/{minResponsesForComments} so far)
                </span>
              </CardBody>
            </Card>
          ) : extra.texts.length === 0 ? (
            <Card>
              <CardBody className="py-8 text-center text-sm text-muted">No answers yet.</CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {extra.texts.map((text, i) => (
                <Card key={i}>
                  <CardBody className="text-sm">{text}</CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
