import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { hashOtp } from "@/lib/crypto";
import { withErrors } from "@/lib/api";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const POST = withErrors(async (req: NextRequest) => {
  const { email, code, newPassword } = await req.json();
  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: "email, code and newPassword are required" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const adminRows = await sql`select id, is_active from admins where email = ${email.trim()}`;
  const admin = adminRows[0];
  if (!admin || !admin.is_active) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  const okAttempts = await checkRateLimit(`staff-reset-verify:${admin.id}`, 8, 15 * 60);
  if (!okAttempts) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const codeHash = hashOtp(code, "staff-reset", admin.id);
  const codeRows = await sql`
    select id from staff_reset_codes
    where admin_id = ${admin.id} and code_hash = ${codeHash} and consumed = false and expires_at > now()
    order by created_at desc
    limit 1
  `;
  if (!codeRows[0]) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await sql`update admins set password_hash = ${passwordHash} where id = ${admin.id}`;
  // All outstanding codes for this account are spent by a successful
  // reset, not just the one used — same one-shot logic as the student OTP
  // flow, so an old code from a previous request can't be replayed later.
  await sql`delete from staff_reset_codes where admin_id = ${admin.id}`;

  return NextResponse.json({ ok: true });
});
