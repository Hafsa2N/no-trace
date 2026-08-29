import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { BookOpen, Copy, AlertTriangle, FileText, Lightbulb } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getClassSessionOverview, getClassAnalysis } from "@/lib/sessionAnalytics";
import { generateInsights } from "@/lib/insights";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/CopyButton";
import { buttonClasses } from "@/components/ui/Button";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { OfferingsTable } from "@/components/OfferingsTable";
import { AccessDetails } from "@/components/AccessDetails";
import { McqDistributionList } from "@/components/ui/McqDistributionList";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function SessionOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const overview = await getClassSessionOverview(id);
  if (!overview) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <p>Session not found.</p>
      </div>
    );
  }

  const { session: cls, offerings, eligibleCount, participantCount, responseRate, evidenceLevel } = overview;

  // Faculty never see the whole class overview — only their own subject's
  // results, not their colleagues' — so send them straight to their
  // offering(s) instead.
  if (admin.role === "faculty") {
    const own = offerings.filter((o) => o.assignedFaculty === admin.id);
    if (own.length === 0) redirect("/admin");
    if (own.length === 1) redirect(`/admin/sessions/${id}/offerings/${own[0].id}`);
    // Rare: teaches more than one subject to the same class — fall through
    // to a filtered list below instead of a hard redirect.
  }

  const visibleOfferings = admin.role === "faculty" ? offerings.filter((o) => o.assignedFaculty === admin.id) : offerings;

  const now = new Date();
  const isOpen = now >= new Date(cls.opensAt) && now <= new Date(cls.closesAt);
  const isClosed = now > new Date(cls.closesAt);
  const statusTone = isOpen ? "success" : isClosed ? "neutral" : "warning";
  const statusLabel = isOpen ? "Open" : isClosed ? "Closed" : "Not open";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const studentUrl = `${baseUrl}/session/${cls.id}`;
  const qrDataUrl = await QRCode.toDataURL(studentUrl, { margin: 1, width: 200 });

  // Only worth computing (and showing) once there's something to analyze —
  // an admin opening a session with zero responses should see the QR code
  // front and center instead, since that's the actionable thing right now.
  const classAnalysis = admin.role === "admin" && participantCount > 0 ? await getClassAnalysis(id) : null;
  const classInsights = classAnalysis
    ? generateInsights({
        averages: classAnalysis.dimensionAverages,
        sentiment: classAnalysis.analysis ? classAnalysis.analysis.sentiment : null,
        themes: classAnalysis.analysis ? classAnalysis.analysis.themes : {},
        responseCount: classAnalysis.responseCount,
        evidenceLevel,
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: admin.role === "admin" ? "Sessions" : "Your sessions", href: "/admin" },
          { label: `${cls.department} · Y${cls.year} · ${cls.section}` },
        ]}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight">
              {cls.department} · Year {cls.year} · Section {cls.section}
            </h1>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <p className="text-sm text-muted">
            One QR code for the whole class — students verify once and rate every subject below in
            one sitting.
          </p>
        </div>
        {admin.role === "admin" && (
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/admin/sessions/${cls.id}/report`} className={buttonClasses("secondary", "sm")}>
              <FileText className="h-3.5 w-3.5" />
              Report
            </Link>
            <Link href={`/admin/sessions/new?from=${cls.id}`} className={buttonClasses("secondary", "sm")}>
              <Copy className="h-3.5 w-3.5" />
              Duplicate for new term
            </Link>
            <DeleteSessionButton sessionId={cls.id} />
          </div>
        )}
      </div>

      {admin.role === "admin" && eligibleCount === 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>No students match this class.</strong> The roster has no one in {cls.department},
            Year {cls.year}, Section {cls.section} — the QR code and link below won&apos;t work for
            anyone until either the roster is corrected or this session&apos;s class details match an
            actual class. Check{" "}
            <Link href="/admin/roster" className="font-medium underline underline-offset-2">
              the uploaded roster
            </Link>
            .
          </span>
        </div>
      )}

      {admin.role === "admin" && (
        <AccessDetails defaultOpen={isOpen}>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR code linking to the feedback form"
              width={160}
              height={160}
              className="rounded-lg border border-border"
            />
            <div className="w-full space-y-3 text-sm">
              <div>
                <p className="mb-1 text-muted">Passcode</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-mono text-lg font-semibold tracking-wide">{cls.passcode}</p>
                  <CopyButton value={cls.passcode} />
                </div>
              </div>
              <div>
                <p className="mb-1 text-muted">Direct link</p>
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="min-w-0 truncate font-mono text-xs">{studentUrl}</p>
                  <CopyButton value={studentUrl} />
                </div>
              </div>
            </div>
          </div>
        </AccessDetails>
      )}

      {classAnalysis && (classAnalysis.overallAverage !== null || classAnalysis.mcqDistributions.length > 0) && (
        <Card>
          <CardBody className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted" />
                  <h2 className="font-medium">Class analysis</h2>
                </div>
                {classAnalysis.overallAverage !== null && (
                  <span className="text-sm font-semibold tabular-nums text-foreground">{classAnalysis.overallAverage} / 5 overall</span>
                )}
              </div>
              {classInsights.length > 0 ? (
                <ul className="space-y-2">
                  {classInsights.map((insight, i) => (
                    <li key={i} className="text-sm text-foreground">
                      — {insight.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Not enough data yet for a pattern-level read — check individual subjects below.</p>
              )}
            </div>
            {classAnalysis.mcqDistributions.map((d) => (
              <McqDistributionList key={d.id} distribution={d} />
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted">Participation</div>
        <div className="px-4 py-3.5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-foreground">
              {participantCount} of {eligibleCount} students{responseRate !== null ? ` · ${responseRate}%` : ""}
            </span>
            {evidenceLevel && (
              <Badge tone={evidenceLevel === "high" ? "success" : evidenceLevel === "moderate" ? "warning" : "neutral"}>
                {evidenceLevel === "high" ? "Strong evidence" : evidenceLevel === "moderate" ? "Some evidence" : "Limited evidence"}
              </Badge>
            )}
          </div>
          {responseRate !== null && (
            <div className="h-1.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${responseRate}% response rate`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${responseRate}%` }} />
            </div>
          )}
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted" />
          <h2 className="font-medium">Subjects</h2>
        </div>
        {visibleOfferings.length === 0 ? (
          <Card>
            <CardBody className="py-8 text-center text-sm text-muted">No subjects added yet.</CardBody>
          </Card>
        ) : (
          <OfferingsTable sessionId={id} offerings={visibleOfferings} isAdmin={admin.role === "admin"} />
        )}
      </div>
    </div>
  );
}
