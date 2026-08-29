"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Label, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DotCanvas } from "@/components/kinetic/DotCanvas";
import { Magnetic } from "@/components/kinetic/Magnetic";

const CLAIMS = ["VERIFIED, NOT TRACEABLE", "ONE-TIME TOKEN", "ZERO IDENTITY KEYS", "ANONYMOUS BY DESIGN"];

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
      {/* Identity panel — same cream/paper ground as the rest of the product,
          separated from the form only by a hairline border, not a color-mode
          flip. The homepage's own stylesheet uses --ink as text and one
          small button accent, never as a full-section background — this
          panel now follows that same rule instead of being its own dark
          insert with no counterpart anywhere else in the app. */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
        <DotCanvas className="opacity-50" />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-16">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">Staff access</p>
          <h1 className="font-display mt-4 text-[56px] font-black uppercase leading-[0.9] text-foreground">
            No one
            <br />
            <span className="text-primary">traces</span>
            <br />
            back to them.
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
            The same architecture that protects your students holds on this
            side of the login, too — this account can see aggregated
            results, never who submitted what.
          </p>
        </div>
        <div className="relative z-10 overflow-hidden border-t border-border">
          <div className="flex w-max animate-[marquee_22s_linear_infinite] gap-10 whitespace-nowrap px-5 py-4 font-display text-sm font-black uppercase tracking-wide text-muted">
            {[...CLAIMS, ...CLAIMS].map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-step-in">
          {/* One header block at every width — page title first, always —
              rather than two divergent headers (a bare wordmark on mobile,
              "Log in" only on desktop) that told a phone visitor the brand
              but never the page's actual purpose. */}
          <div className="mb-8">
            {/* No repeated wordmark here — the persistent app header above
                already shows it at every width, on this page and every
                other. A second "No Trace" a few lines below the first
                added weight without adding information. */}
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Staff access</p>
            <h1 className="font-display mt-1.5 text-3xl font-black uppercase tracking-tight lg:text-2xl">Log in</h1>
            <p className="mt-1 text-sm text-muted">For principals, HODs, and faculty</p>
            {/* The identity panel makes this case at length, but it's
                lg-only — a phone visitor otherwise never sees the one
                reassurance that matters before typing a password in. */}
            <p className="mt-3 text-xs text-muted lg:hidden">
              Results here are always aggregated — this account can never see who submitted what.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/admin/forgot-password" className="text-xs font-medium text-primary underline underline-offset-2">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id={passwordId}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Magnetic className="block w-full" strength={0.15}>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Logging in…" : "Log in"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </Magnetic>
          </form>
        </div>
      </div>
    </div>
  );
}
