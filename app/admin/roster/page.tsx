import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { RosterUploadForm } from "@/components/RosterUploadForm";

export default async function RosterUploadPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const [countRows, classRows, lastUpload] = await Promise.all([
    sql`select count(*) as count from students`,
    sql`select department, year, section, count(*) as count from students group by department, year, section order by department, year, section`,
    sql`
      select a.created_at, a.details, ad.email as uploaded_by
      from audit_log a
      left join admins ad on ad.id = a.actor_id
      where a.action = 'roster.uploaded'
      order by a.created_at desc
      limit 1
    `,
  ]);

  const totalStudents = Number(countRows[0].count);
  const last = lastUpload[0];

  return (
    <div className="mx-auto max-w-lg px-6 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">Student roster</h1>
        <p className="mt-1.5 text-sm text-muted">
          Excel file with columns:{" "}
          <code className="rounded bg-primary-light px-1 py-0.5 text-primary">
            roll_number, name, department, year, section, email
          </code>
          . Existing rows with the same roll number are updated, not duplicated.
        </p>
      </div>

      {totalStudents > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Users className="h-4 w-4 text-muted" />
            <p className="text-sm font-medium">
              {totalStudents} student{totalStudents === 1 ? "" : "s"} on file
            </p>
            {last && (
              <p className="ml-auto text-xs text-muted">
                Last uploaded {new Date(last.created_at).toLocaleDateString()}
                {last.uploaded_by ? ` by ${last.uploaded_by}` : ""}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2 font-medium">
                  Department
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Year
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Section
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Students
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classRows.map((c) => (
                <tr key={`${c.department}-${c.year}-${c.section}`}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{c.department}</td>
                  <td className="px-4 py-2.5 text-muted">{c.year}</td>
                  <td className="px-4 py-2.5 text-muted">{c.section}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">
          {totalStudents > 0 ? "Upload a new file" : "Upload your roster"}
        </p>
        <RosterUploadForm />
      </div>
    </div>
  );
}
