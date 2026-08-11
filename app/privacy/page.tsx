import Link from "next/link";
import { KeyRound, Fingerprint, Database, ShieldOff, Users2, ChevronDown, UserCog } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";

const tables = [
  { name: "students", holds: "Roster: roll number, name, department, section, email, and when you consented — viewable and deletable by you anytime at /my-data.", side: "identity" },
  { name: "otp_codes", holds: "A verification code, valid for 5 minutes. Deleted immediately once used, and any abandoned/expired code is purged on the next request — nothing lingers.", side: "identity" },
  { name: "session_participants", holds: "A salted one-way hash of (roll number + session id) — proves \"has this student already submitted,\" but cannot be reversed back to a roll number.", side: "identity" },
  { name: "tokens", holds: "A random 256-bit one-time code minted after verification. Contains only a session id — nothing that identifies a student.", side: "anonymous" },
  { name: "responses", holds: "Ratings, comments, and a session id. No student identifier column exists in this table at all.", side: "anonymous" },
];

const steps = [
  {
    icon: KeyRound,
    title: "You verify who you are",
    body: "Roll number plus a one-time code sent to your college email — this only confirms you're a real, eligible student. It happens in a separate part of the system from feedback storage.",
  },
  {
    icon: Fingerprint,
    title: "You get an anonymous, one-time pass",
    body: "Once verified, you're issued a random code with zero connection to your identity — not your name, not your roll number, not your email.",
  },
  {
    icon: Database,
    title: "Your feedback is stored against that pass, not you",
    body: "Every response is tied to the random code and the session only. There is no column, table, or log anywhere that connects it back to a student.",
  },
  {
    icon: ShieldOff,
    title: "Even the duplicate-check can't identify you",
    body: "The record that stops you from submitting twice stores a one-way cryptographic hash of your roll number — not the roll number itself — in a table completely separate from responses.",
  },
  {
    icon: Users2,
    title: "Comments are held back until enough people respond",
    body: "Faculty only see written comments once enough students in a session have answered that no single comment could be picked out and attributed to one person.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">How your privacy is protected</h1>
        <p className="mt-3 text-muted">
          This platform is built so that identity verification and feedback storage never touch
          each other. Here&apos;s exactly what happens when you submit feedback:
        </p>

        <ol className="mt-10 space-y-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Card>
                <CardBody className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <h2 className="font-medium">{title}</h2>
                    </div>
                    <p className="text-sm text-muted">{body}</p>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <Alert tone="info">
            No system can stop you from identifying yourself if you choose to write something
            identifying in a comment — that part is up to you. Everything else is designed so
            that even someone with full database access cannot connect a response back to a
            student.
          </Alert>
        </div>

        <Card className="mt-8">
          <CardBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <UserCog className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium">Your data rights</p>
                <p className="text-sm text-muted">
                  Separate from your anonymous feedback: see, correct, or delete the roster record
                  we hold about you, verified the same way — roll number and a one-time code.
                </p>
              </div>
            </div>
            <Link href="/my-data" className={buttonClasses("secondary", "md")}>
              View my data
            </Link>
          </CardBody>
        </Card>

        <details className="group mt-8 rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium">
            Technical details, for anyone who wants to verify this rather than trust it
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border px-5 py-4 text-sm">
            <p className="text-muted">
              This isn&apos;t a policy promise — it&apos;s how the database is actually structured.
              Every table below exists on one side or the other; none of them can be joined to
              connect a response back to a student.
            </p>
            <div className="mt-4 space-y-3">
              {tables.map((t) => (
                <div key={t.name} className="flex gap-3">
                  <code
                    className={`h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
                      t.side === "identity" ? "bg-primary-light text-primary" : "bg-accent-light text-accent"
                    }`}
                  >
                    {t.name}
                  </code>
                  <p className="text-muted">{t.holds}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-muted">
              The duplicate-submission check uses a keyed hash (HMAC), salted per session, so the
              same student&apos;s hash is different in every session — a database dump alone can&apos;t
              even tell whether the same person participated in two different sessions. Your
              college&apos;s own IT or security team is welcome to review the source code directly
              rather than take this page&apos;s word for it.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
