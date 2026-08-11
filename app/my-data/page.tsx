"use client";

import { useState } from "react";
import { Mail, ShieldCheck, Trash2 } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { StepIndicator } from "@/components/StepIndicator";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { Alert } from "@/components/ui/Alert";

type Step = "roll" | "otp" | "view" | "deleted";
type StudentRecord = {
  roll_number: string;
  name: string;
  department: string;
  year: number;
  section: string;
  email: string;
  consent_given_at: string | null;
  created_at: string;
};

const STEP_LABELS = ["Verify", "Confirm", "Your data"];
const STEP_INDEX: Record<string, number> = { roll: 0, otp: 1, view: 2, deleted: 2 };

export default function MyDataPage() {
  const [step, setStep] = useState<Step>("roll");
  const [rollNumber, setRollNumber] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [record, setRecord] = useState<StudentRecord | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/my-data/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setMaskedEmail(data.sentTo);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/my-data/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "Something went wrong");
      return;
    }
    setToken(data.token);

    const dataRes = await fetch("/api/my-data", { headers: { Authorization: `Bearer ${data.token}` } });
    const studentData = await dataRes.json();
    setSubmitting(false);
    if (!dataRes.ok) {
      setError(studentData.error ?? "Could not load your data");
      return;
    }
    setRecord(studentData.student);
    setStep("view");
  }

  async function deleteMyData() {
    if (!confirm("Delete your roster record permanently? You won't be able to submit feedback for future sessions until re-added by your college. This can't be undone.")) {
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/my-data/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Could not delete your data. Try again.");
      return;
    }
    setStep("deleted");
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Your data</h1>
          <p className="text-sm text-muted">
            See what we hold on you, or ask us to delete it — separate from and unrelated to any
            feedback you&apos;ve submitted, which was never linked to your identity in the first
            place.
          </p>
        </div>

        <div className="mb-8">
          <StepIndicator steps={STEP_LABELS} current={STEP_INDEX[step]} />
        </div>

        {step === "roll" && (
          <Card>
            <CardBody>
              <form onSubmit={requestOtp} className="space-y-5">
                <Field label="Roll number">
                  <Input
                    placeholder="e.g. CSE3A01"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    autoFocus
                    required
                  />
                </Field>
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send verification code"}
                </Button>
              </form>
            </CardBody>
          </Card>
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
              </form>
            </CardBody>
          </Card>
        )}

        {step === "view" && record && (
          <div className="space-y-4">
            <Card>
              <CardBody className="space-y-3 text-sm">
                <Row label="Roll number" value={record.roll_number} />
                <Row label="Name" value={record.name} />
                <Row label="Department" value={record.department} />
                <Row label="Year / Section" value={`${record.year} / ${record.section}`} />
                <Row label="Email" value={record.email} />
                <Row
                  label="Consent recorded"
                  value={record.consent_given_at ? new Date(record.consent_given_at).toLocaleDateString() : "Not yet — first session you verify for"}
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="mb-3 text-sm text-muted">
                  This is your roster record — the only thing about you the system stores. It has
                  never been, and can&apos;t be, linked to any feedback you&apos;ve submitted.
                </p>
                {error && (
                  <div className="mb-3">
                    <Alert tone="error">{error}</Alert>
                  </div>
                )}
                <Button variant="danger" className="w-full" onClick={deleteMyData} disabled={submitting}>
                  <Trash2 className="h-4 w-4" />
                  {submitting ? "Deleting…" : "Delete my data"}
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {step === "deleted" && (
          <Card>
            <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <p className="font-medium">Your data has been deleted</p>
              <p className="max-w-xs text-sm text-muted">
                Your roster record is gone. You&apos;ll need to be re-added by your college to
                submit feedback in future sessions.
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
