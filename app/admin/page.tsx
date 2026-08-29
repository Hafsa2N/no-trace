import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Plus, Check, Circle, AlertTriangle } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getEvidenceLevel, getInstitutionResponseRateTrend } from "@/lib/sessionAnalytics";
import { Card, CardBody } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { SessionsTable } from "@/components/SessionsTable";
import { DepartmentTable } from "@/components/DepartmentTable";
import { TrendLine } from "@/components/ui/TrendLine";
import { DotCanvas } from "@/components/kinetic/DotCanvas";

function ChecklistItem({ done, href, label }: { done: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-background sm:flex-1"
    >
      {done ? (
        <Check className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted" />
      )}
      <span className={done ? "text-muted line-through" : "text-foreground"}>{label}</span>
    </Link>
  );
}

const EVIDENCE_READ: Record<"high" | "moderate" | "low", string> = {
  high: "Strong evidence — this rate holds up; safe to act on directly.",
  moderate: "Some evidence — reasonable to trust, worth a second look before big decisions.",
  low: "Limited evidence — read this as directional, not conclusive.",
};

// The dashboard's opening move: the one number that answers "is this
// working," read as a signal with its own evidentiary weight attached, not
// a KPI box sitting next to three others of equal visual rank. Same cream/
// paper ground as the rest of the product — the homepage's own dark usage
// is text and one small button accent, never a full section, so this stays
// on that same light surface instead of being a one-off dark insert.
function SignalPanel({
  rateLabel,
  context,
  evidenceLevel,
  cycles,
  openNow,
}: {
  rateLabel: string;
  context: string;
  evidenceLevel: "high" | "moderate" | "low" | null;
  cycles: number;
  openNow: number;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <DotCanvas className="opacity-30" />
      <div className="relative z-10 flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Institutional signal</p>
          <p className="font-display mt-1.5 text-6xl font-black tabular-nums leading-none text-foreground">{rateLabel}</p>
          <p className="mt-2 text-sm text-muted">{context}</p>
          {evidenceLevel && (
            <p className={`mt-1 text-xs ${evidenceLevel === "low" ? "text-warning" : "text-accent"}`}>
              {EVIDENCE_READ[evidenceLevel]}
            </p>
          )}
        </div>
        <div className="flex gap-8 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <div>
            <p className="font-display text-2xl font-black tabular-nums text-foreground">{cycles}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Feedback cycles
            </p>
          </div>
          <div>
            <p className="font-display text-2xl font-black tabular-nums text-foreground">{openNow}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Open now
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// No icon — the same bare mono-uppercase treatment the login page's own
// "Staff access" eyebrow uses. A repeated generic icon in front of four
// unrelated section names (attention, evidence, exploration, sessions)
// didn't distinguish them; it just decorated all four identically.
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{children}</p>;
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

  const institutionTrend = session.role === "admin" ? await getInstitutionResponseRateTrend() : [];
  const institutionTrendUsable = institutionTrend.filter((p) => p.status === "ok");
  const institutionTrendShowable = institutionTrendUsable.length > 1;

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
  const overallEvidence = getEvidenceLevel(overallRate);
  const openSessions = sessions.filter((s) => now >= new Date(s.opens_at) && now <= new Date(s.closes_at));

  const attentionSessions = openSessions.filter((s) => {
    const eligible = Number(s.eligible_count);
    const participants = Number(s.participant_count);
    const rate = eligible > 0 ? (participants / eligible) * 100 : 100;
    const minutesLeft = (new Date(s.closes_at).getTime() - now.getTime()) / 60_000;
    // "low" here is the same research-backed <40% threshold used everywhere
    // else evidence level is shown, not a separate ad hoc cutoff.
    return getEvidenceLevel(rate) === "low" || minutesLeft < 15;
  });

  // Department-level rollup — computed from the same rows already fetched
  // above, not a second query. This is the actual "department dashboard":
  // real aggregates from real sessions, never invented numbers. A college
  // with only one department on the roster gets a one-row table, which is
  // the honest result, not a chart forced to look busier than the data is.
  const departmentMap = new Map<string, { sessions: number; participants: number; eligible: number }>();
  for (const s of sessions) {
    const entry = departmentMap.get(s.department) ?? { sessions: 0, participants: 0, eligible: 0 };
    entry.sessions += 1;
    entry.participants += Number(s.participant_count);
    entry.eligible += Number(s.eligible_count);
    departmentMap.set(s.department, entry);
  }
  const departments = Array.from(departmentMap.entries())
    .map(([department, d]) => ({
      department,
      sessions: d.sessions,
      // Suppressed below 5 eligible students, same threshold used for the
      // small-N comment gate elsewhere — a department with 1-2 eligible
      // students showing an exact rate is a real re-identification risk
      // for anyone who already knows the roster, even though the rate
      // itself is just a number with no names attached.
      responseRate: d.eligible >= 5 ? Math.round((d.participants / d.eligible) * 100) : null,
      tooFewEligible: d.eligible > 0 && d.eligible < 5,
    }))
    .sort((a, b) => (b.responseRate ?? -1) - (a.responseRate ?? -1));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            {session.role === "admin" ? "Institutional overview" : "Your sessions"}
          </h1>
          <p className="text-sm text-muted">
            {session.role === "admin"
              ? "What's happening across active feedback cycles, in real time."
              : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {session.role === "admin" && (
          <div className="flex gap-2.5">
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
        <Card className="mb-6 border-primary/25">
          <div className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted">
            Set up this instance — three things, in any order
          </div>
          <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
            <ChecklistItem done={onboarding.hasRoster} href="/admin/roster" label="Upload the student roster" />
            <ChecklistItem done={onboarding.hasFaculty} href="/admin/staff/new" label="Add a faculty account" />
            <ChecklistItem done={onboarding.hasSession} href="/admin/sessions/new" label="Create the first session" />
          </div>
        </Card>
      )}

      {/* SIGNAL — the one number that answers "is this working," with its
          evidentiary weight stated inline rather than implied by design. */}
      {session.role === "admin" && sessions.length > 0 && (
        <SignalPanel
          rateLabel={overallRate !== null ? `${overallRate}%` : "—"}
          context={`${totalParticipants} of ${totalEligible} eligible students have responded`}
          evidenceLevel={overallEvidence}
          cycles={sessions.length}
          openNow={openSessions.length}
        />
      )}

      {/* ACTION — what actually needs a decision right now. Only takes up
          space when there's something to act on; nothing to perform when
          the answer is "nothing." */}
      {attentionSessions.length > 0 && (
        <div className="mb-6">
          <SectionEyebrow>Needs your attention</SectionEyebrow>
          <Card className="overflow-hidden border-warning/25">
            <div className="divide-y divide-border">
              {attentionSessions.map((s) => {
                const minutesLeft = Math.round((new Date(s.closes_at).getTime() - now.getTime()) / 60_000);
                return (
                  <Link
                    key={s.id}
                    href={`/admin/sessions/${s.id}`}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-warning-light"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <span className="text-foreground">
                      <strong>
                        {s.department} · Year {s.year} · Section {s.section}
                      </strong>{" "}
                      <span className="text-muted">
                        — {s.participant_count} of {s.eligible_count} responded, closes in{" "}
                        {minutesLeft > 0 ? `${minutesLeft}m` : "moments"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* EVIDENCE — is it improving, and how much history backs that up.
          An intentional low-data state instead of a lonely sentence in a
          box: the dot pattern (echoing the identity panel above) reads as
          "the instrument is real, it just doesn't have enough readings
          yet" rather than "something is missing here." */}
      {session.role === "admin" && institutionTrend.length > 0 && (
        <div className="mb-6">
          <SectionEyebrow>Evidence over time</SectionEyebrow>
          <Card>
            <CardBody>
              <h2 className="font-display text-lg font-black uppercase tracking-tight">Institutional response rate, by term</h2>
              <p className="text-xs text-muted">
                Pooled participation across every session college-wide — total students who
                responded ÷ total eligible students per term.
              </p>
              {institutionTrendShowable ? (
                <div className="mt-4">
                  <TrendLine
                    points={institutionTrend.map((p) => ({ label: p.termName, value: p.status === "ok" ? p.rate : null }))}
                    tone="primary"
                  />
                </div>
              ) : (
                <div className="relative mt-4 overflow-hidden rounded-lg border border-dashed border-border">
                  <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                      backgroundImage: "radial-gradient(var(--muted) 1px, transparent 1px)",
                      backgroundSize: "14px 14px",
                    }}
                    aria-hidden="true"
                  />
                  <div className="relative px-5 py-6 text-center">
                    <p className="font-display text-3xl font-black tabular-nums text-muted">
                      {institutionTrendUsable.length}/{institutionTrend.length}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      Terms with enough evidence
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                      {institutionTrendUsable.length === 1
                        ? "One term available — a trend needs at least two comparable terms to show direction."
                        : "Not enough historical data yet to show a trend. This fills in on its own as more terms collect responses — nothing to configure."}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* EXPLORATION — the drill-down layer: real per-department and
          per-session data, deliberately given less visual weight than the
          signal above it so the page reads as summary-then-detail. */}
      {session.role === "admin" && departments.length > 0 && (
        <div className="mb-6">
          <SectionEyebrow>Explore by department</SectionEyebrow>
          <DepartmentTable departments={departments} />
        </div>
      )}

      <SectionEyebrow>{session.role === "admin" ? "All sessions" : "Your sessions"}</SectionEyebrow>
      <SessionsTable
        sessions={sessions.map((s) => ({
          id: s.id,
          department: s.department,
          year: s.year,
          section: s.section,
          opens_at: s.opens_at instanceof Date ? s.opens_at.toISOString() : s.opens_at,
          closes_at: s.closes_at instanceof Date ? s.closes_at.toISOString() : s.closes_at,
          participant_count: s.participant_count,
          eligible_count: s.eligible_count,
          subjects: s.subjects,
        }))}
      />
    </div>
  );
}
