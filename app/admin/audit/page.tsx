import { redirect } from "next/navigation";
import { ScrollText, Plus, Upload, Megaphone, EyeOff, Eye } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";

const ACTION_META: Record<string, { icon: typeof ScrollText; label: string }> = {
  "session.created": { icon: Plus, label: "created session" },
  "update.posted": { icon: Megaphone, label: "posted update" },
  "roster.uploaded": { icon: Upload, label: "uploaded roster" },
  "comment.hidden": { icon: EyeOff, label: "hid a comment" },
  "comment.unhidden": { icon: Eye, label: "unhid a comment" },
};

export default async function AuditLogPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const entries = await sql`
    select a.action, a.target_id, a.details, a.created_at, ad.email as actor_email
    from audit_log a
    left join admins ad on ad.id = a.actor_id
    order by a.created_at desc
    limit 100
  `;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-muted" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted">Administrative actions only — never feedback content or identity.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-muted">No actions logged yet.</CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => {
            const meta = ACTION_META[e.action] ?? { icon: ScrollText, label: e.action };
            const Icon = meta.icon;
            const details = e.details as Record<string, unknown> | null;
            return (
              <Card key={i}>
                <CardBody className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{e.actor_email ?? "Unknown"}</span> {meta.label}
                      {details && "subject" in details ? ` — ${String(details.subject)}` : ""}
                      {details && "title" in details ? ` — ${String(details.title)}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
