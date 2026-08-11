import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Megaphone } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

export default async function AdminUpdatesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const updates = await sql`
    select id, title, body, department, created_at from updates order by created_at desc
  `;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feedback changelog</h1>
          <p className="text-sm text-muted">Shown to students at /updates</p>
        </div>
        {session.role === "admin" && (
          <Link href="/admin/updates/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" />
            Post update
          </Link>
        )}
      </div>

      {updates.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <p className="font-medium">Nothing posted yet</p>
            <p className="max-w-xs text-sm text-muted">
              Post what changed because of past feedback so students see it wasn&apos;t ignored.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <Card key={u.id}>
              <CardBody>
                <div className="mb-1.5 flex items-center gap-2">
                  <p className="font-medium">{u.title}</p>
                  {u.department && <Badge tone="primary">{u.department}</Badge>}
                </div>
                <p className="text-sm text-muted">{u.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
