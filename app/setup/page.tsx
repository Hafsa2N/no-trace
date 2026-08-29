"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

type Status = "checking" | "ready" | "already-done" | "form" | "submitting" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => setStatus(data.needsSetup ? "form" : "already-done"))
      .catch(() => setStatus("form"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setStatus("submitting");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("form");
      setError(data.error ?? "Could not complete setup");
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/admin");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="bg-hero flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Set up this instance</h1>
          <p className="mt-1 text-sm text-muted">Create the first admin account for your college</p>
        </div>

        <Card>
          <CardBody>
            {status === "checking" && <LoadingScreen label="Checking this instance…" />}

            {status === "already-done" && (
              <Alert tone="info">
                <span className="animate-step-in">
                  Setup has already been completed for this deployment. Log in with your existing
                  admin account instead.
                </span>
              </Alert>
            )}

            {status === "done" && (
              <div className="animate-step-in flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-accent" />
                <p className="text-sm font-medium">Admin account created — signing you in…</p>
              </div>
            )}

            {(status === "form" || status === "submitting") && (
              <form onSubmit={onSubmit} className="animate-step-in space-y-4">
                <p className="text-sm text-muted">
                  This runs once. As soon as this account is created, this page stops working —
                  add more admins from within the app after logging in.
                </p>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </Field>
                <Field label="Password" hint="At least 8 characters.">
                  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </Field>
                <Field label="Confirm password">
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Field>
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" className="w-full" disabled={status === "submitting"}>
                  {status === "submitting" ? "Creating…" : "Create admin account"}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
