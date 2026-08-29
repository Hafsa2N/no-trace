"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { OtpInput } from "@/components/ui/OtpInput";

type Step = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setInfo(data.message);
    setStep("reset");
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setStep("done");
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  return (
    <div className="bg-hero flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">
            For any staff account — admin or faculty. A code goes to the email on file.
          </p>
        </div>

        <Card>
          <CardBody>
            {step === "email" && (
              <form onSubmit={requestCode} className="animate-step-in space-y-4">
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </Field>
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send reset code"}
                </Button>
                <p className="text-center text-sm">
                  <Link href="/admin/login" className="font-medium text-primary underline underline-offset-2">
                    Back to login
                  </Link>
                </p>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={submitReset} className="animate-step-in space-y-4">
                {info && <Alert tone="info">{info}</Alert>}
                <Field label="6-digit code">
                  <OtpInput value={code} onChange={setCode} />
                </Field>
                <Field label="New password" hint="At least 8 characters.">
                  <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                </Field>
                <Field label="Confirm new password">
                  <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </Field>
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" className="w-full" disabled={submitting || code.length < 6}>
                  {submitting ? "Resetting…" : "Reset password"}
                </Button>
              </form>
            )}

            {step === "done" && (
              <div className="animate-step-in flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-accent" />
                <p className="text-sm font-medium">Password reset — taking you to login…</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
