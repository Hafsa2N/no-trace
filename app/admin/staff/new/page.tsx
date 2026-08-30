"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { csrfHeaders } from "@/lib/csrf-client";

export default function NewStaffPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "faculty">("faculty");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ email, password, role, name }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create account");
      return;
    }
    router.push("/admin/staff");
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl font-black uppercase tracking-tight">Add a staff account</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        Give them this email and password to log in at /admin/login. Faculty will only see
        results for subjects you assign to them when creating a session.
      </p>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name" hint="Optional — shown instead of their email wherever results are attributed to them, e.g. in a class's analysis.">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Priya Rao" />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters — share this with them directly.">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Role">
              <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "faculty")}>
                <option value="faculty">Faculty — sees only subjects assigned to them</option>
                <option value="admin">Admin — full access, can create sessions and add staff</option>
              </Select>
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
