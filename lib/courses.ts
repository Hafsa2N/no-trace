import { sql } from "@/lib/db";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Case-insensitive reuse-or-create for a course. This is what keeps
 * "DBMS" typed three different ways across three semesters from
 * fragmenting the trend data — every session for the same subject in the
 * same department resolves to one canonical course_id.
 */
export async function resolveCourseId(name: string, department: string): Promise<string> {
  const normalized = normalizeName(name);
  const existing = await sql`
    select id from courses where lower(name) = lower(${normalized}) and department = ${department}
  `;
  if (existing.length > 0) return existing[0].id as string;

  const rows = await sql`
    insert into courses (name, department) values (${normalized}, ${department}) returning id
  `;
  return rows[0].id as string;
}

export async function resolveTermId(name: string, startsAt: string, endsAt: string): Promise<string> {
  const normalized = normalizeName(name);
  const existing = await sql`select id from terms where lower(name) = lower(${normalized})`;
  if (existing.length > 0) return existing[0].id as string;

  const rows = await sql`
    insert into terms (name, starts_at, ends_at) values (${normalized}, ${startsAt}, ${endsAt}) returning id
  `;
  return rows[0].id as string;
}
