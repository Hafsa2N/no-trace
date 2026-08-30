"use client";

import { use, useEffect, useId, useState } from "react";
import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import "@/lib/dotlottieSetup";
import {
  ShieldCheck,
  Mail,
  AlertTriangle,
  Megaphone,
  Clock,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  WifiOff,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { DotCanvas } from "@/components/kinetic/DotCanvas";
import { StepIndicator } from "@/components/StepIndicator";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { RatingScale } from "@/components/ui/RatingScale";
import { Alert } from "@/components/ui/Alert";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

type Question = { id: string; type: "rating" | "text" | "mcq"; label: string; options?: string[] };
type Offering = { id: string; subject: string };
type SessionInfo = {
  id: string;
  department: string;
  year: number;
  section: string;
  questions: Question[];
  offerings: Offering[];
  status: "not_open" | "open" | "closed";
  closesAt: string;
};

type Step = "loading" | "roll" | "otp" | "form" | "review" | "done" | "error" | "already_submitted";
type ErrorKind = "not_open" | "closed" | "network" | "generic";
type UpdateInfo = { title: string; body: string; department: string | null };

const STEP_LABELS = ["Verify", "Confirm", "Feedback"];
const TRUST_CLAIMS = ["VERIFIED, NOT IDENTIFIED", "ONE-TIME CODE", "NO ROLL-NUMBER LINK", "ANONYMOUS BY DESIGN"];
const STEP_INDEX: Record<string, number> = { roll: 0, otp: 1, form: 2, review: 2, done: 2 };
const RESEND_COOLDOWN_SECONDS = 30;

// The backend is the sole authority on this — session_participants has a
// primary key on (session_id, roll_number_hash), so a second attempt always
// fails atomically at the database, never based on anything the client
// remembers. This is just recognizing that specific server message to show
// a calmer, dedicated screen instead of a generic red error box.
function isAlreadySubmittedMessage(message: string): boolean {
  return message.toLowerCase().includes("already submitted");
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function StudentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rollNumberId = useId();
  const passcodeId = useId();

  const [rollNumber, setRollNumber] = useState("");
  const [passcode, setPasscode] = useState("");
  const [consent, setConsent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");

  // Keyed by offering id, since one verification now covers every subject
  // taught to this class — a student answers the same rubric once per
  // subject instead of scanning a separate QR code for each.
  const [ratings, setRatings] = useState<Record<string, Record<string, number | string>>>({});
  // Keyed by offeringId, then by questionId — a subject can have more than
  // one free-text question (e.g. "what worked" and "what to change"), and
  // they need separate storage or the second textarea's typing would
  // silently overwrite the first's.
  const [comments, setComments] = useState<Record<string, Record<string, string>>>({});

  // One subject per screen rather than a long scroll — research on
  // conversational/multi-step forms consistently shows meaningfully higher
  // completion for longer forms this way (Typeform's own analysis of 2.6M
  // forms found ~47% completion for one-question-at-a-time vs. ~22%
  // industry average on comparable-length forms).
  const [offeringIndex, setOfferingIndex] = useState(0);

  // Filled in after a successful submission — "your rating vs. the class
  // so far" per subject. Closing this loop is well-supported: survey
  // research finds respondents who see what their input contributed to
  // are measurably more likely to participate again, which a static form
  // tool structurally can't offer since it has no analysis layer at all.
  const [quickStats, setQuickStats] = useState<Record<string, { responseCount: number; averages: Record<string, number> }>>({});

  const [latestUpdate, setLatestUpdate] = useState<UpdateInfo | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const tick = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(tick);
  }, [resendCooldown]);

  function loadSession() {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setErrorKind("generic");
          setStep("error");
          return;
        }
        setSession(data);
        setStep(data.status === "open" ? "roll" : "error");
        if (data.status !== "open") {
          setErrorKind(data.status === "not_open" ? "not_open" : "closed");
          setError(data.status === "not_open" ? "This session hasn't opened yet." : "This session has closed.");
        }

        // Best-effort: surface the most relevant "what changed" update
        // inline, right where the student already is — not as a link to a
        // page they'd otherwise never visit on their own.
        fetch(`/api/updates?department=${encodeURIComponent(data.department)}&limit=1`)
          .then((r) => r.json())
          .then((u) => setLatestUpdate(u.updates?.[0] ?? null))
          .catch(() => {});
      })
      .catch(() => {
        setError("Could not reach the server. Check your connection and try again.");
        setErrorKind("network");
        setStep("error");
      });
  }

  useEffect(loadSession, [id]);

  function retryLoadSession() {
    setStep("loading");
    loadSession();
  }

  async function requestOtpCode(): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, rollNumber, passcode, consent }),
      });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      return false;
    }
    const data = await res.json();
    if (!res.ok) {
      const message = data.error ?? "Something went wrong";
      // Authoritative check happens server-side, at the database's primary
      // key on (session_id, roll_number_hash) — this only recognizes that
      // specific message to route to a calmer dedicated screen instead of
      // a generic red error box; it never decides "already submitted" on
      // its own.
      if (isAlreadySubmittedMessage(message)) {
        setStep("already_submitted");
        return false;
      }
      setError(message);
      return false;
    }
    setMaskedEmail(data.sentTo);
    return true;
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await requestOtpCode();
    setSubmitting(false);
    if (ok) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    setError("");
    setCode("");
    const ok = await requestOtpCode();
    if (ok) setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    let res: Response;
    try {
      res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, rollNumber, code }),
      });
    } catch {
      setSubmitting(false);
      setError("Could not reach the server. Check your connection and try again.");
      return;
    }
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      const message = data.error ?? "Something went wrong";
      // The race this closes: two verify requests for the same student
      // racing each other (e.g. a double-tap) — the primary key on
      // session_participants lets only one through, and the loser lands
      // here with the same message the roster path uses.
      if (isAlreadySubmittedMessage(message)) {
        setStep("already_submitted");
        return;
      }
      setError(message);
      return;
    }
    setToken(data.token);
    setStep("form");
  }

  const ratingQuestions = session?.questions.filter((q) => q.type === "rating") ?? [];
  const mcqQuestions = session?.questions.filter((q) => q.type === "mcq") ?? [];
  const textQuestions = session?.questions.filter((q) => q.type === "text") ?? [];

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setSubmitting(true);
    const submissions = session.offerings.map((o) => {
      const offeringComments = comments[o.id] ?? {};
      // Every text answer rides along in `ratings` (already a flexible
      // jsonb bag of number/string values, same as MCQ) so any number of
      // free-text questions can be asked, not just one. The question
      // literally named "comment" also still populates the legacy
      // `comment` column, since that's what the existing sentiment/theme
      // analysis pipeline and the small-N anonymity gate read from.
      return {
        offeringId: o.id,
        ratings: { ...ratings[o.id], ...offeringComments },
        comment: offeringComments["comment"] ?? null,
      };
    });
    let res: Response;
    try {
      res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sessionId: id, submissions }),
      });
    } catch {
      // Answers are still sitting safely in component state — nothing is
      // lost, the student can just try again once they're back online.
      setSubmitting(false);
      setError("Could not reach the server. Your answers are still here — check your connection and try again.");
      return;
    }
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Your answers are still here — try again.");
      return;
    }
    setStep("done");

    // Best-effort, after the fact — the submission itself never waits on
    // this, and if it fails the student still sees their confirmation,
    // just without the comparison.
    Promise.all(
      session.offerings.map((o) =>
        fetch(`/api/offerings/${o.id}/quick-stats`)
          .then((r) => r.json())
          .then((stats) => [o.id, stats] as const)
      )
    )
      .then((entries) => setQuickStats(Object.fromEntries(entries)))
      .catch(() => {});
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        {session && step !== "loading" && step !== "error" && step !== "already_submitted" && (
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-black uppercase tracking-tight">
                {session.department} · Year {session.year} · Section {session.section}
              </h1>
              <p className="text-sm text-muted">
                {session.offerings.length} subject{session.offerings.length === 1 ? "" : "s"} in this session
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {step !== "roll" && (
                <span className="flex items-center gap-1 rounded-full bg-accent-light px-2.5 py-1 text-xs font-medium text-accent">
                  <ShieldCheck className="h-3 w-3" />
                  Anonymous
                </span>
              )}
              {step !== "done" &&
                (() => {
                  const remainingMs = new Date(session.closesAt).getTime() - now;
                  const urgent = remainingMs < 2 * 60_000;
                  return (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        urgent ? "bg-danger-light text-danger" : "bg-slate-100 text-muted dark:bg-white/5"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {remainingMs > 0 ? formatCountdown(remainingMs) : "Closing…"}
                    </span>
                  );
                })()}
            </div>
          </div>
        )}

        {(step === "roll" || step === "otp" || step === "form" || step === "review") && (
          <div className="mb-8">
            <StepIndicator steps={STEP_LABELS} current={STEP_INDEX[step]} />
          </div>
        )}

        {step === "loading" && <LoadingScreen label="Loading session…" />}

        {step === "error" &&
          (() => {
            const ErrorIcon = errorKind === "network" ? WifiOff : errorKind === "not_open" ? Clock : AlertTriangle;
            const title =
              errorKind === "not_open"
                ? "Not open yet"
                : errorKind === "closed"
                  ? "This session has closed"
                  : errorKind === "network"
                    ? "Connection problem"
                    : "Can't open this session";
            return (
              <Card className="animate-step-in">
                <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-light text-danger">
                    <ErrorIcon className="h-5 w-5" />
                  </span>
                  <p className="font-display text-lg font-black uppercase tracking-tight">{title}</p>
                  <p className="max-w-xs text-sm text-muted">{error}</p>
                  {errorKind === "network" && (
                    <Button type="button" variant="secondary" size="sm" onClick={retryLoadSession} className="mt-2">
                      <RotateCw className="h-3.5 w-3.5" />
                      Try again
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })()}

        {step === "already_submitted" && (
          <Card className="animate-step-in">
            <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-light text-accent">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="font-display text-lg font-black uppercase tracking-tight">Already submitted</p>
              <p className="max-w-xs text-sm text-muted">
                You&apos;ve already submitted feedback for this session. Thank you — nothing
                further is needed.
              </p>
            </CardBody>
          </Card>
        )}

        {step === "roll" && (
          <div className="animate-step-in space-y-4">
            {/* Compact identity moment — same cream/paper ground as the rest
                of the product, not a dark insert. The homepage's own dark
                usage is limited to text and one small button accent, never
                a full section background, so this panel follows that rule
                instead of being a one-off exception. */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
              <DotCanvas className="opacity-40" />
              <div className="relative z-10 px-5 pb-4 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Anonymous feedback</p>
                <h2 className="font-display mt-1.5 text-2xl font-black uppercase leading-[0.95] text-foreground sm:text-3xl">
                  Verified. <span className="text-primary">Never identified.</span>
                </h2>
              </div>
              <div className="relative z-10 overflow-hidden border-t border-border">
                <div className="flex w-max animate-[marquee_20s_linear_infinite] gap-8 whitespace-nowrap px-5 py-2.5 font-display text-[11px] font-black uppercase tracking-wide text-muted">
                  {[...TRUST_CLAIMS, ...TRUST_CLAIMS].map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {latestUpdate && (
              <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent-light px-3.5 py-3 text-sm text-accent">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-medium">Last time this made a difference:</span>{" "}
                  {latestUpdate.title}
                </span>
              </div>
            )}
            <Card>
              <CardBody>
                <form onSubmit={requestOtp} className="space-y-5">
                  <p className="text-sm text-muted">
                    Enter your roll number to verify you&apos;re eligible for this session. Your
                    identity is checked only to confirm eligibility — it is never linked to what
                    you submit.{" "}
                    <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
                      How this works
                    </Link>
                    .
                  </p>
                  <div>
                    <label htmlFor={rollNumberId} className="mb-1.5 block text-sm font-medium text-foreground">
                      Roll number
                    </label>
                    <Input
                      id={rollNumberId}
                      placeholder="e.g. CSE3A01"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={passcodeId} className="mb-1.5 block text-sm font-medium text-foreground">
                      Class passcode
                    </label>
                    <Input
                      id={passcodeId}
                      aria-describedby={`${passcodeId}-hint`}
                      placeholder="e.g. 0FF2A840"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="font-mono uppercase tracking-wide"
                      required
                    />
                    <p id={`${passcodeId}-hint`} className="mt-1.5 text-xs text-muted">
                      Shown on screen or shared by your faculty for this session.
                    </p>
                  </div>
                  <label className="flex items-start gap-2.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                    />
                    <span>
                      I understand my roll number and college email are used only to verify my
                      eligibility for this session, per the{" "}
                      <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  {error && <Alert tone="error">{error}</Alert>}
                  <Button type="submit" className="w-full" disabled={submitting || !consent}>
                    {submitting ? "Sending…" : "Send verification code"}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        )}

        {step === "otp" && (
          <Card className="animate-step-in">
            <CardBody>
              <form onSubmit={verifyOtp} className="space-y-5">
                <div className="flex items-start gap-2.5 text-sm text-muted">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Enter the 6-digit code sent to <span className="font-medium text-foreground">{maskedEmail}</span>.
                  </span>
                </div>
                <OtpInput value={code} onChange={setCode} />
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" className="w-full" disabled={submitting || code.length < 6}>
                  {submitting ? "Verifying…" : "Verify"}
                </Button>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resendCooldown > 0}
                  className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:text-muted"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get a code? Resend"}
                </button>
              </form>
            </CardBody>
          </Card>
        )}

        {step === "form" &&
          session &&
          (() => {
            const currentOffering = session.offerings[offeringIndex];
            const isFirst = offeringIndex === 0;
            const isLast = offeringIndex === session.offerings.length - 1;
            const isCurrentComplete =
              ratingQuestions.every((q) => typeof ratings[currentOffering.id]?.[q.id] === "number") &&
              mcqQuestions.every((q) => typeof ratings[currentOffering.id]?.[q.id] === "string");

            function goBack() {
              setError("");
              setOfferingIndex((i) => Math.max(0, i - 1));
            }

            function goNextOrReview(e: React.FormEvent) {
              e.preventDefault();
              setError("");
              if (isLast) {
                setStep("review");
                return;
              }
              setOfferingIndex((i) => i + 1);
            }

            return (
              <div key={offeringIndex} className="animate-step-in space-y-5">
                {offeringIndex === 0 && (
                  <Alert tone="success">
                    You&apos;re verified — this form is fully anonymous, nothing here is linked to
                    your identity.
                  </Alert>
                )}
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                    Subject {offeringIndex + 1} of {session.offerings.length}
                  </p>
                  <div
                    className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"
                    role="progressbar"
                    aria-valuenow={offeringIndex + 1}
                    aria-valuemin={1}
                    aria-valuemax={session.offerings.length}
                    aria-label="Subjects completed"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${((offeringIndex + 1) / session.offerings.length) * 100}%` }}
                    />
                  </div>
                </div>
                <form onSubmit={goNextOrReview} className="space-y-5">
                  <div className="space-y-7">
                    <h2 className="font-display text-2xl font-black uppercase tracking-tight">{currentOffering.subject}</h2>
                    {ratingQuestions.map((q) => (
                      <div key={q.id}>
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">{q.label}</p>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">Required</span>
                        </div>
                        <RatingScale
                          label={q.label}
                          value={ratings[currentOffering.id]?.[q.id] as number | undefined}
                          onChange={(n) =>
                            setRatings((r) => ({
                              ...r,
                              [currentOffering.id]: { ...r[currentOffering.id], [q.id]: n },
                            }))
                          }
                        />
                        <div className="mt-1.5 flex justify-between text-xs text-muted">
                          <span>Strongly disagree</span>
                          <span>Strongly agree</span>
                        </div>
                      </div>
                    ))}
                    {mcqQuestions.map((q) => (
                      <div key={q.id}>
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">{q.label}</p>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">Required</span>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-label={q.label}>
                          {(q.options ?? []).map((option) => {
                            const selected = ratings[currentOffering.id]?.[q.id] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  setRatings((r) => ({
                                    ...r,
                                    [currentOffering.id]: { ...r[currentOffering.id], [q.id]: option },
                                  }))
                                }
                                className={`min-h-11 rounded-full border px-4 py-2.5 text-sm transition-colors ${
                                  selected
                                    ? "border-primary-solid bg-primary-solid text-white"
                                    : "border-border text-foreground hover:border-primary/40"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {textQuestions.map((q) => {
                      const textFieldId = `${currentOffering.id}-${q.id}`;
                      return (
                        <div key={q.id}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <label htmlFor={textFieldId} className="text-sm font-medium text-foreground">
                              {q.label}
                            </label>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">Optional</span>
                          </div>
                          <Textarea
                            id={textFieldId}
                            aria-describedby={`${textFieldId}-hint`}
                            rows={3}
                            value={comments[currentOffering.id]?.[q.id] ?? ""}
                            onChange={(e) =>
                              setComments((c) => ({
                                ...c,
                                [currentOffering.id]: { ...c[currentOffering.id], [q.id]: e.target.value },
                              }))
                            }
                          />
                          <p id={`${textFieldId}-hint`} className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
                            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                            Please avoid including names or identifying details.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {error && <Alert tone="error">{error}</Alert>}
                  <div className="flex gap-3">
                    {!isFirst && (
                      <Button type="button" variant="secondary" onClick={goBack} className="flex-1">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                    )}
                    <Button type="submit" className="flex-1" disabled={!isCurrentComplete}>
                      {isLast ? "Review answers" : (
                        <>
                          Next
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  {!isCurrentComplete && (
                    <p className="text-center text-xs text-muted">Answer every required question above to continue.</p>
                  )}
                </form>
              </div>
            );
          })()}

        {step === "review" &&
          session &&
          (() => {
            // The real moment worth an animation isn't clicking the button
            // — it's the actual network round-trip while the anonymous
            // token gets consumed and the response is written. Showing it
            // here, during the real request, is honest; a fixed delay just
            // to show an animation wouldn't be.
            if (submitting) {
              return <LoadingScreen key="submitting" label="Sending your feedback…" />;
            }
            return (
              <div className="animate-step-in space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-black uppercase tracking-tight">Ready to submit?</h2>
                  <p className="mt-1 text-sm text-muted">
                    Your response will be recorded anonymously — there&apos;s no way to connect it
                    back to you afterward, and no way to edit it once sent.
                  </p>
                </div>
                {/* Recaps exactly what will be sent — the question, the
                    answer, the comment text — and nothing else. No roll
                    number, email, token, or internal id ever appears here;
                    this screen only ever reads from `ratings`/`comments`,
                    which never held identity to begin with. */}
                <div className="space-y-3">
                  {session.offerings.map((o, i) => {
                    const offeringRatings = ratings[o.id] ?? {};
                    const offeringComments = comments[o.id] ?? {};
                    return (
                      <div key={o.id} className="rounded-lg border border-border">
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                            {o.subject}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOfferingIndex(i);
                              setStep("form");
                            }}
                            className="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
                          >
                            Edit
                          </button>
                        </div>
                        <dl className="divide-y divide-border px-4 text-sm">
                          {[...ratingQuestions, ...mcqQuestions].map((q) => (
                            <div key={q.id} className="flex items-center justify-between gap-3 py-2">
                              <dt className="text-muted">{q.label}</dt>
                              <dd className="shrink-0 font-medium text-foreground">
                                {q.type === "rating" ? `${offeringRatings[q.id]} / 5` : offeringRatings[q.id]}
                              </dd>
                            </div>
                          ))}
                          {textQuestions.map((q) => {
                            const text = offeringComments[q.id]?.trim();
                            return (
                              <div key={q.id} className="py-2">
                                <dt className="text-muted">{q.label}</dt>
                                <dd className="mt-0.5 text-foreground">{text || <span className="text-muted">Left blank</span>}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    );
                  })}
                </div>
                {error && <Alert tone="error">{error}</Alert>}
                <form onSubmit={submitFeedback} className="space-y-3">
                  <Button type="submit" className="w-full">
                    Submit feedback
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setOfferingIndex(session.offerings.length - 1);
                      setStep("form");
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to answers
                  </Button>
                </form>
              </div>
            );
          })()}

        {step === "done" && session && (
          <div className="animate-step-in space-y-4">
            <Card>
              <CardBody className="flex flex-col items-center gap-1 py-6 text-center">
                <div className="h-28 w-28">
                  <DotLottieReact src="/animations/loading.lottie" autoplay loop={false} />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">Feedback received</p>
                <p className="font-display mt-1 text-2xl font-black uppercase tracking-tight">Thank you.</p>
                <p className="max-w-xs text-sm text-muted">
                  Your response has been submitted anonymously. There&apos;s no record connecting
                  it back to you.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Protected by design — not just policy
                </div>
              </CardBody>
            </Card>

            {session.offerings.some((o) => (quickStats[o.id]?.responseCount ?? 0) > 0) && (
              <Card>
                <CardBody>
                  <p className="mb-4 text-sm font-medium">How your ratings compare so far</p>
                  <div className="space-y-4">
                    {session.offerings.map((o) => {
                      const stats = quickStats[o.id];
                      if (!stats || stats.responseCount === 0) return null;

                      const yourValues = ratingQuestions
                        .map((q) => ratings[o.id]?.[q.id])
                        .filter((v): v is number => typeof v === "number");
                      const classValues = Object.values(stats.averages);
                      if (yourValues.length === 0 || classValues.length === 0) return null;

                      const yourAvg = yourValues.reduce((a, b) => a + b, 0) / yourValues.length;
                      const classAvg = classValues.reduce((a, b) => a + b, 0) / classValues.length;
                      const diff = Math.round((yourAvg - classAvg) * 10) / 10;
                      const DiffIcon = diff > 0.1 ? TrendingUp : diff < -0.1 ? TrendingDown : Minus;

                      return (
                        <div key={o.id}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{o.subject}</span>
                            <span className="text-xs text-muted">
                              {stats.responseCount} response{stats.responseCount === 1 ? "" : "s"} so far
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-4 text-sm">
                            <span>
                              You: <strong className="text-foreground">{yourAvg.toFixed(1)}</strong>
                            </span>
                            <span className="text-muted">
                              Class: <strong className="text-foreground">{classAvg.toFixed(1)}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <DiffIcon className="h-3 w-3" />
                              {diff > 0 ? "above" : diff < 0 ? "below" : "in line with"} average
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {latestUpdate && (
              <Card>
                <CardBody className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-accent">Feedback doesn&apos;t disappear here</p>
                    <p className="mt-0.5 font-medium">{latestUpdate.title}</p>
                    <p className="mt-1 text-sm text-muted">{latestUpdate.body}</p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
