"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Mail, Hourglass, AlertTriangle, Megaphone, Clock, RotateCw } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { StepIndicator } from "@/components/StepIndicator";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { RatingScale } from "@/components/ui/RatingScale";
import { Alert } from "@/components/ui/Alert";

type Question = { id: string; type: "rating" | "text"; label: string };
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

type Step = "loading" | "roll" | "otp" | "form" | "done" | "error";
type UpdateInfo = { title: string; body: string; department: string | null };

const STEP_LABELS = ["Verify", "Confirm", "Feedback"];
const STEP_INDEX: Record<string, number> = { roll: 0, otp: 1, form: 2, done: 2 };
const RESEND_COOLDOWN_SECONDS = 30;

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
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rollNumber, setRollNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");

  // Keyed by offering id, since one verification now covers every subject
  // taught to this class — a student answers the same rubric once per
  // subject instead of scanning a separate QR code for each.
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

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

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setStep("error");
          return;
        }
        setSession(data);
        setStep(data.status === "open" ? "roll" : "error");
        if (data.status !== "open") {
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
        setError("Could not load this session. Check the link and try again.");
        setStep("error");
      });
  }, [id]);

  async function requestOtpCode(): Promise<boolean> {
    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, rollNumber, consent }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
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
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, rollNumber, code }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setToken(data.token);
    setStep("form");
  }

  const ratingQuestions = session?.questions.filter((q) => q.type === "rating") ?? [];
  const textQuestions = session?.questions.filter((q) => q.type === "text") ?? [];

  const isFormComplete =
    session !== null &&
    session.offerings.every((o) => ratingQuestions.every((q) => typeof ratings[o.id]?.[q.id] === "number"));

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setSubmitting(true);
    const submissions = session.offerings.map((o) => ({
      offeringId: o.id,
      ratings: ratings[o.id] ?? {},
      comment: comments[o.id] ?? null,
    }));
    const res = await fetch("/api/feedback/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, sessionId: id, submissions }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setStep("done");
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        {session && step !== "loading" && step !== "error" && (
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {session.department} · Year {session.year} · Section {session.section}
              </h1>
              <p className="text-sm text-muted">
                {session.offerings.length} subject{session.offerings.length === 1 ? "" : "s"} in this session
              </p>
            </div>
            {step !== "done" &&
              (() => {
                const remainingMs = new Date(session.closesAt).getTime() - now;
                const urgent = remainingMs < 2 * 60_000;
                return (
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      urgent ? "bg-danger-light text-danger" : "bg-slate-100 text-muted dark:bg-white/5"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {remainingMs > 0 ? formatCountdown(remainingMs) : "Closing…"}
                  </span>
                );
              })()}
          </div>
        )}

        {(step === "roll" || step === "otp" || step === "form") && (
          <div className="mb-8">
            <StepIndicator steps={STEP_LABELS} current={STEP_INDEX[step]} />
          </div>
        )}

        {step === "loading" && (
          <div className="flex items-center justify-center py-24 text-muted">
            <Hourglass className="mr-2 h-4 w-4 animate-pulse" />
            Loading session…
          </div>
        )}

        {step === "error" && (
          <Card>
            <CardBody className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="font-medium">Can&apos;t open this session</p>
                <p className="mt-1 text-sm text-muted">{error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {step === "roll" && (
          <div className="space-y-4">
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
                  <Field label="Roll number">
                    <Input
                      placeholder="e.g. CSE3A01"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      autoFocus
                      required
                    />
                  </Field>
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
          <Card>
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

        {step === "form" && session && (
          <div className="space-y-5">
            <Alert tone="success">
              You&apos;re verified. Rate every subject below in one go — this form is fully
              anonymous, nothing here is linked to your identity.
            </Alert>
            <form onSubmit={submitFeedback} className="space-y-5">
              {session.offerings.map((offering) => (
                <Card key={offering.id}>
                  <CardBody className="space-y-6">
                    <h2 className="font-semibold">{offering.subject}</h2>
                    {ratingQuestions.map((q) => (
                      <div key={q.id}>
                        <p className="mb-3 text-sm font-medium">{q.label}</p>
                        <RatingScale
                          value={ratings[offering.id]?.[q.id]}
                          onChange={(n) =>
                            setRatings((r) => ({
                              ...r,
                              [offering.id]: { ...r[offering.id], [q.id]: n },
                            }))
                          }
                        />
                        <div className="mt-1.5 flex justify-between text-xs text-muted">
                          <span>Strongly disagree</span>
                          <span>Strongly agree</span>
                        </div>
                      </div>
                    ))}
                    {textQuestions.map((q) => (
                      <Field key={q.id} label={q.label}>
                        <Textarea
                          rows={3}
                          value={comments[offering.id] ?? ""}
                          onChange={(e) => setComments((c) => ({ ...c, [offering.id]: e.target.value }))}
                        />
                      </Field>
                    ))}
                  </CardBody>
                </Card>
              ))}
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" className="w-full" disabled={submitting || !isFormComplete}>
                {submitting ? "Submitting…" : "Submit anonymously"}
              </Button>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="font-medium">Thank you</p>
                <p className="max-w-xs text-sm text-muted">
                  Your anonymous feedback has been recorded. There&apos;s no record connecting it
                  back to you.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Protected by design — not just policy
                </div>
              </CardBody>
            </Card>

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
      </div>
    </div>
  );
}
