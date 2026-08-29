import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AuditLogClient, type AuditEntry } from "@/components/AuditLogClient";

export default async function AuditLogPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const rows = await sql`
    select a.action, a.target_id, a.details, a.created_at, ad.email as actor_email
    from audit_log a
    left join admins ad on ad.id = a.actor_id
    order by a.created_at desc
    limit 100
  `;
  const entries: AuditEntry[] = rows.map((r) => ({
    action: r.action as string,
    actorEmail: r.actor_email as string | null,
    details: r.details as Record<string, unknown> | null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at as string),
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Audit log</h1>
          <p className="text-sm text-muted">Administrative actions only — never feedback content or identity.</p>
        </div>
      </div>
      <AuditLogClient entries={entries} />
    </div>
  );
}
