import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, Users2 } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";

export default async function StaffPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const staff = await sql`select id, email, role, created_at from admins order by role, email`;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-muted" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Staff accounts</h1>
            <p className="text-sm text-muted">Who can log in, and with what access</p>
          </div>
        </div>
        <Link href="/admin/staff/new" className={buttonClasses("primary", "md")}>
          <UserPlus className="h-4 w-4" />
          Add staff
        </Link>
      </div>

      <div className="space-y-2">
        {staff.map((s) => (
          <Card key={s.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.email}</p>
                <p className="text-xs text-muted">
                  Added {new Date(s.created_at).toLocaleDateString()}
                  {s.id === session.id ? " · you" : ""}
                </p>
              </div>
              <Badge tone={s.role === "admin" ? "primary" : "neutral"}>
                {s.role === "admin" ? "Admin" : "Faculty"}
              </Badge>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border px-4 py-3 text-xs text-muted">
        <strong className="font-medium text-foreground">Admin</strong> can upload the roster,
        create sessions, assign faculty, and see every subject&apos;s results.{" "}
        <strong className="font-medium text-foreground">Faculty</strong> can only view results for
        subjects an admin has specifically assigned to them — never a colleague&apos;s, and
        faculty can never create a session themselves.
      </div>
    </div>
  );
}
