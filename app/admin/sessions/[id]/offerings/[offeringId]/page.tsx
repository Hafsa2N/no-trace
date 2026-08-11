import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquareText, Users, Lock, Sparkles, Smile, Meh, Frown } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getOfferingAnalytics } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ModeratedComment } from "@/components/ModeratedComment";

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

  const {
    offering,
    responseCount,
    eligibleCount,
    responseRate,
    responseConfidence,
    averages,
    commentRecords,
    hiddenCommentCount,
    commentsWithheld,
    minResponsesForComments,
    analysis,
  } = analytics;

  const sentimentTotal = analysis ? analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative : 0;
  const topThemes = analysis
    ? Object.entries(analysis.themes)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        {admin.role === "admin" && (
          <Link href={`/admin/sessions/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to class session
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{offering.courseName}</h1>
        <p className="text-sm text-muted">
          {offering.department} · Year {offering.year} · Section {offering.section}
        </p>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="font-medium">
            Results{" "}
            <span className="text-sm text-muted">
              ({responseCount} of {eligibleCount} eligible students responded
              {responseRate !== null ? ` · ${responseRate}%` : ""})
            </span>
          </h2>
          {responseConfidence && (
            <Badge tone={responseConfidence === "high" ? "success" : responseConfidence === "moderate" ? "warning" : "neutral"}>
              {responseConfidence === "high" ? "High confidence" : responseConfidence === "moderate" ? "Moderate confidence" : "Low confidence"}
            </Badge>
          )}
        </div>
        {responseConfidence === "low" && responseCount > 0 && (
          <p className="mb-3 text-xs text-muted">
            Response rate is under 40% — research on course evaluations finds this level shows
            significantly different (usually lower) scores than 50–75% response rates. Treat
            these averages as directional, not representative of the whole class.
          </p>
        )}
        {responseConfidence === "moderate" && (
          <p className="mb-3 text-xs text-muted">
            Response rate is under the ~66% threshold generally considered reliable for course
            evaluations — some sampling bias is likely.
          </p>
        )}
        {Object.keys(averages).length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-muted">No responses yet.</CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="space-y-4">
              {Object.entries(averages).map(([key, avg]) => (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="capitalize">{key}</span>
                    <span className="font-medium">{avg} / 5</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary-light">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(avg / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>

      {analysis && sentimentTotal > 0 && (
        <div>
          <h2 className="mb-3 font-medium">Sentiment</h2>
          <Card>
            <CardBody>
              <div className="flex h-2.5 overflow-hidden rounded-full">
                <div className="bg-accent" style={{ width: `${(analysis.sentiment.positive / sentimentTotal) * 100}%` }} />
                <div className="bg-slate-300 dark:bg-white/15" style={{ width: `${(analysis.sentiment.neutral / sentimentTotal) * 100}%` }} />
                <div className="bg-danger" style={{ width: `${(analysis.sentiment.negative / sentimentTotal) * 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5"><Smile className="h-3.5 w-3.5 text-accent" /> {analysis.sentiment.positive} positive</span>
                <span className="flex items-center gap-1.5"><Meh className="h-3.5 w-3.5 text-muted" /> {analysis.sentiment.neutral} neutral</span>
                <span className="flex items-center gap-1.5"><Frown className="h-3.5 w-3.5 text-danger" /> {analysis.sentiment.negative} negative</span>
              </div>
              <p className="mt-3 text-xs text-muted">
                Scored with a fixed word-lexicon (AFINN-165), not a model — deterministic and
                re-checkable by hand.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {topThemes.length > 0 && (
        <div>
          <h2 className="mb-3 font-medium">Common themes</h2>
          <Card>
            <CardBody className="flex flex-wrap gap-2">
              {topThemes.map(([theme, count]) => (
                <Badge key={theme} tone="primary">
                  {theme} · {count}
                </Badge>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {analysis && analysis.highlights.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted" />
            <h2 className="font-medium">Most representative comments</h2>
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
          <h2 className="font-medium">All comments</h2>
          {hiddenCommentCount > 0 && <span className="text-xs text-muted">({hiddenCommentCount} hidden by staff)</span>}
        </div>
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
    </div>
  );
}
