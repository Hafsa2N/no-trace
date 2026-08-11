import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

type RosterRow = {
  roll_number: string;
  name: string;
  department: string;
  year: number;
  section: string;
  email: string;
};

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const rows: RosterRow[] = [];
  for (const raw of rawRows) {
    const rollNumber = String(raw.roll_number ?? raw["Roll Number"] ?? "").trim();
    const name = String(raw.name ?? raw["Name"] ?? "").trim();
    const department = String(raw.department ?? raw["Department"] ?? "").trim();
    const year = Number(raw.year ?? raw["Year"] ?? 0);
    const section = String(raw.section ?? raw["Section"] ?? "").trim();
    const email = String(raw.email ?? raw["Email"] ?? "").trim();

    if (!rollNumber || !name || !email) continue; // skip malformed rows
    rows.push({ roll_number: rollNumber, name, department, year, section, email });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found in file" }, { status: 400 });
  }

  let inserted = 0;
  for (const row of rows) {
    await sql`
      insert into students (roll_number, name, department, year, section, email)
      values (${row.roll_number}, ${row.name}, ${row.department}, ${row.year}, ${row.section}, ${row.email})
      on conflict (roll_number) do update set
        name = excluded.name,
        department = excluded.department,
        year = excluded.year,
        section = excluded.section,
        email = excluded.email
    `;
    inserted++;
  }

  await logAction(session.id, "roster.uploaded", undefined, { rowsProcessed: rows.length, upserted: inserted });

  return NextResponse.json({ ok: true, rowsProcessed: rows.length, upserted: inserted });
});
