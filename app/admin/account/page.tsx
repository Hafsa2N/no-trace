"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { csrfHeaders } from "@/lib/csrf-client";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Your account</h1>
          <p className="text-sm text-muted">Change the password for your own login</p>
        </div>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Current password">
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Confirm new password">
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            {success && <Alert tone="success">Password changed.</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Changing…" : "Change password"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
