import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async () => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`select id, name, starts_at, ends_at from terms order by starts_at desc`;
  return NextResponse.json({ terms: rows });
});

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, startsAt, endsAt } = await req.json();
  if (!name || !startsAt || !endsAt) {
    return NextResponse.json({ error: "name, startsAt and endsAt required" }, { status: 400 });
  }
  const normalized = String(name).trim().replace(/\s+/g, " ");

  const existing = await sql`select id, name, starts_at, ends_at from terms where lower(name) = lower(${normalized})`;
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, term: existing[0], reused: true });
  }

  const rows = await sql`
    insert into terms (name, starts_at, ends_at) values (${normalized}, ${startsAt}, ${endsAt})
    returning id, name, starts_at, ends_at
  `;
  return NextResponse.json({ ok: true, term: rows[0], reused: false });
});
