import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { MergeCoursesForm } from "@/components/MergeCoursesForm";

export default async function CoursesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  const courses = await sql`
    select c.id, c.name, c.department,
           count(distinct s.term_id) as term_count,
           count(distinct s.id) as session_count
    from courses c
    left join sessions s on s.course_id = c.id
    group by c.id, c.name, c.department
    order by c.department, c.name
  `;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-muted" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted">Cross-semester feedback trends, by course</p>
        </div>
      </div>

      <MergeCoursesForm courses={courses.map((c) => ({ id: c.id, name: c.name, department: c.department }))} />

      {courses.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <p className="font-medium">No courses yet</p>
            <p className="max-w-xs text-sm text-muted">
              Courses are created automatically the first time you make a feedback session for
              them.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/admin/courses/${c.id}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted">{c.department}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span>
                      {c.term_count} term{c.term_count === "1" ? "" : "s"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
