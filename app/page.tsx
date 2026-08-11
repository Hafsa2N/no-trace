import Link from "next/link";
import { ShieldCheck, UserCheck, EyeOff, BarChart3, ArrowRight, QrCode } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";

const pillars = [
  {
    icon: UserCheck,
    title: "Verified students only",
    body: "Every response comes from a real, eligible student — checked against the roster before a single answer is entered.",
  },
  {
    icon: EyeOff,
    title: "Genuinely anonymous",
    body: "Identity verification and feedback storage never share a table, a token, or a log line. Not even an admin can join them.",
  },
  {
    icon: BarChart3,
    title: "Insight, not spreadsheets",
    body: "Faculty and admins see aggregated ratings and themes — never a wall of raw rows to sift through.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <section className="bg-hero border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Built on verified-but-anonymous by design
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Feedback students actually trust enough to be honest in.
          </h1>
          <p className="max-w-xl text-lg text-muted text-balance">
            Colleges get genuine student feedback. Students get a system engineered so no one —
            not even faculty — can trace a response back to them.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/privacy" className={buttonClasses("primary", "lg")}>
              See how anonymity works
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/login" className={buttonClasses("secondary", "lg")}>
              Staff login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 py-16 sm:grid-cols-3">
        {pillars.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardBody>
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="mb-1.5 font-semibold">{title}</h3>
              <p className="text-sm text-muted">{body}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <Card className="overflow-hidden">
          <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Have a session link or QR code?</p>
                <p className="text-sm text-muted">
                  Scan the code shared in class, or open the link your faculty gave you to submit
                  feedback.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
