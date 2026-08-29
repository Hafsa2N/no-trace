import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { generateTempPassword } from "@/lib/crypto";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "No rows found in file" }, { status: 400 });
  }

  const existingRows = await sql`select email from admins`;
  const existingEmails = new Set(existingRows.map((r) => String(r.email).toLowerCase()));
  const seenInFile = new Set<string>();

  const created: { email: string; role: string; tempPassword: string }[] = [];
  const skipped: { row: number; email: string; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // header is row 1
    const email = String(raw.email ?? raw["Email"] ?? "").trim();
    const roleRaw = String(raw.role ?? raw["Role"] ?? "faculty").trim().toLowerCase();
    const name = String(raw.name ?? raw["Name"] ?? "").trim() || null;

    if (!email) {
      skipped.push({ row: rowNum, email: "", reason: "Missing email" });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      skipped.push({ row: rowNum, email, reason: "Not a valid email address" });
      continue;
    }
    if (roleRaw !== "admin" && roleRaw !== "faculty") {
      skipped.push({ row: rowNum, email, reason: `Role must be "admin" or "faculty", got "${roleRaw}"` });
      continue;
    }
    const emailKey = email.toLowerCase();
    if (existingEmails.has(emailKey)) {
      skipped.push({ row: rowNum, email, reason: "Account already exists — not modified" });
      continue;
    }
    if (seenInFile.has(emailKey)) {
      skipped.push({ row: rowNum, email, reason: "Duplicate row in this file" });
      continue;
    }
    seenInFile.add(emailKey);

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await sql`insert into admins (email, password_hash, role, name) values (${email}, ${passwordHash}, ${roleRaw}, ${name})`;
    created.push({ email, role: roleRaw, tempPassword });
  }

  if (created.length > 0) {
    await logAction(session.id, "staff.bulk_created", undefined, {
      count: created.length,
      emails: created.map((c) => c.email),
    });
  }

  return NextResponse.json({ ok: true, created, skipped });
});
