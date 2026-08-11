import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Plus, Users, ChevronRight, Inbox, ListChecks, Radio, TrendingUp, AlertTriangle, Check, Circle } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getResponseConfidence } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

function ChecklistItem({ done, href, label }: { done: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
        done
          ? "border-accent/20 bg-accent-light text-accent"
          : "border-border bg-surface text-foreground hover:border-primary/30"
      }`}
    >
      {done ? <Check className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
      <span className={done ? "line-through opacity-70" : ""}>{label}</span>
    </Link>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <Card className={tone === "warning" ? "border-amber-300/50" : ""}>
      <CardBody className="flex items-center gap-3 py-4">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            tone === "warning" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-primary-light text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-semibold leading-tight">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function AdminDashboard() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  let onboarding: { hasRoster: boolean; hasFaculty: boolean; hasSession: boolean } | null = null;
  if (session.role === "admin") {
    const [rosterRows, facultyRows, sessionRows] = await Promise.all([
      sql`select 1 from students limit 1`,
      sql`select 1 from admins where role = 'faculty' limit 1`,
      sql`select 1 from sessions limit 1`,
    ]);
    onboarding = {
      hasRoster: rosterRows.length > 0,
      hasFaculty: facultyRows.length > 0,
      hasSession: sessionRows.length > 0,
    };
  }
  const onboardingComplete = onboarding ? onboarding.hasRoster && onboarding.hasFaculty && onboarding.hasSession : true;

  // Faculty only ever see class sessions where they teach at least one
  // subject — never every session in the college. Participation counts
  // are class-level facts (how many students verified overall), but the
  // subject list shown to faculty is filtered to their own, not their
  // colleagues' subjects in the same class.
  const sessions =
    session.role === "faculty"
      ? await sql`
          select s.id, s.department, s.year, s.section, s.opens_at, s.closes_at,
                 (select count(*) from session_participants sp where sp.session_id = s.id) as participant_count,
                 (select count(*) from students st
                  where st.department = s.department and st.year = s.year and st.section = s.section) as eligible_count,
                 (select string_agg(c.name, ', ' order by c.name)
                  from session_offerings so left join courses c on c.id = so.course_id
                  where so.session_id = s.id and so.assigned_faculty = ${session.id}) as subjects
          from sessions s
          where exists (select 1 from session_offerings so where so.session_id = s.id and so.assigned_faculty = ${session.id})
          order by s.created_at desc
        `
      : await sql`
          select s.id, s.department, s.year, s.section, s.opens_at, s.closes_at,
                 (select count(*) from session_participants sp where sp.session_id = s.id) as participant_count,
                 (select count(*) from students st
                  where st.department = s.department and st.year = s.year and st.section = s.section) as eligible_count,
                 (select string_agg(c.name, ', ' order by c.name)
                  from session_offerings so left join courses c on c.id = so.course_id
                  where so.session_id = s.id) as subjects
          from sessions s
          order by s.created_at desc
        `;

  const now = new Date();
  const totalParticipants = sessions.reduce((sum, s) => sum + Number(s.participant_count), 0);
  const totalEligible = sessions.reduce((sum, s) => sum + Number(s.eligible_count), 0);
  const overallRate = totalEligible > 0 ? Math.round((totalParticipants / totalEligible) * 100) : null;
  const openSessions = sessions.filter((s) => now >= new Date(s.opens_at) && now <= new Date(s.closes_at));

  const attentionSessions = openSessions.filter((s) => {
    const eligible = Number(s.eligible_count);
    const participants = Number(s.participant_count);
    const rate = eligible > 0 ? (participants / eligible) * 100 : 100;
    const minutesLeft = (new Date(s.closes_at).getTime() - now.getTime()) / 60_000;
    // "low" here is the same research-backed <40% threshold used everywhere
    // else response confidence is shown, not a separate ad hoc cutoff.
    return getResponseConfidence(rate) === "low" || minutesLeft < 15;
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feedback sessions</h1>
          <p className="text-sm text-muted">{sessions.length} total</p>
        </div>
        {session.role === "admin" && (
          <div className="flex gap-3">
            <Link href="/admin/roster" className={buttonClasses("secondary", "md")}>
              <Upload className="h-4 w-4" />
              Upload roster
            </Link>
            <Link href="/admin/sessions/new" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" />
              New session
            </Link>
          </div>
        )}
      </div>

      {onboarding && !onboardingComplete && (
        <Card className="mb-8 border-primary/20 bg-primary-light/30">
          <CardBody>
            <p className="mb-1 font-medium">Get this instance set up</p>
            <p className="mb-4 text-sm text-muted">
              Three things before students can give feedback — in any order.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <ChecklistItem done={onboarding.hasRoster} href="/admin/roster" label="1. Upload the student roster" />
              <ChecklistItem done={onboarding.hasFaculty} href="/admin/staff/new" label="2. Add a faculty account" />
              <ChecklistItem done={onboarding.hasSession} href="/admin/sessions/new" label="3. Create the first session" />
            </div>
          </CardBody>
        </Card>
      )}

      {sessions.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={ListChecks} label="Total sessions" value={String(sessions.length)} />
          <StatTile icon={Radio} label="Open now" value={String(openSessions.length)} />
          <StatTile
            icon={TrendingUp}
            label="Overall response rate"
            value={overallRate !== null ? `${overallRate}%` : "—"}
          />
          <StatTile
            icon={AlertTriangle}
            label="Needs attention"
            value={String(attentionSessions.length)}
            tone={attentionSessions.length > 0 ? "warning" : "neutral"}
          />
        </div>
      )}

      {attentionSessions.length > 0 && (
        <div className="mb-6 space-y-2">
          {attentionSessions.map((s) => {
            const minutesLeft = Math.round((new Date(s.closes_at).getTime() - now.getTime()) / 60_000);
            return (
              <Link key={s.id} href={`/admin/sessions/${s.id}`}>
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-300/50 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>
                      {s.department} · Year {s.year} · Section {s.section}
                    </strong>{" "}
                    — {s.participant_count} of {s.eligible_count} responded, closes in{" "}
                    {minutesLeft > 0 ? `${minutesLeft}m` : "moments"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {sessions.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
              <Inbox className="h-5 w-5" />
            </span>
            <p className="font-medium">No sessions yet</p>
            <p className="max-w-xs text-sm text-muted">
              Create a feedback session to get a QR code and passcode students can use to submit
              responses for every subject in their class.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isOpen = now >= new Date(s.opens_at) && now <= new Date(s.closes_at);
            const isClosed = now > new Date(s.closes_at);
            const tone = isOpen ? "success" : isClosed ? "neutral" : "warning";
            const label = isOpen ? "Open" : isClosed ? "Closed" : "Not open";

            return (
              <Link key={s.id} href={`/admin/sessions/${s.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardBody className="flex items-center justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium">
                          {s.department} · Year {s.year} · Section {s.section}
                        </p>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <p className="text-sm text-muted">{s.subjects ?? "No subjects yet"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted">
                        <Users className="h-3.5 w-3.5" />
                        {s.participant_count} of {s.eligible_count}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
