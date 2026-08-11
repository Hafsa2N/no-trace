import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Users, ChevronRight, MessageSquareText, BookOpen } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getClassSessionOverview } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/CopyButton";

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

  const { session: cls, offerings, eligibleCount, participantCount, responseRate, responseConfidence } = overview;

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
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
        <Card>
          <CardBody className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
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
          </CardBody>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="font-medium">
            Participation{" "}
            <span className="text-sm text-muted">
              ({participantCount} of {eligibleCount} students {responseRate !== null ? `· ${responseRate}%` : ""})
            </span>
          </h2>
          {responseConfidence && (
            <Badge tone={responseConfidence === "high" ? "success" : responseConfidence === "moderate" ? "warning" : "neutral"}>
              {responseConfidence === "high" ? "High confidence" : responseConfidence === "moderate" ? "Moderate confidence" : "Low confidence"}
            </Badge>
          )}
        </div>
      </div>

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
          <div className="space-y-2">
            {visibleOfferings.map((o) => (
              <Link key={o.id} href={`/admin/sessions/${id}/offerings/${o.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardBody className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{o.courseName}</p>
                      {admin.role === "admin" && o.facultyEmail && (
                        <p className="text-sm text-muted">{o.facultyEmail}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted">
                        <MessageSquareText className="h-3.5 w-3.5" />
                        {o.responseCount}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
