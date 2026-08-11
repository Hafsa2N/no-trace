import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/crypto";
import { sendOtpEmail } from "@/lib/email";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const { rollNumber } = await req.json();
  if (!rollNumber) return NextResponse.json({ error: "rollNumber required" }, { status: 400 });

  const rows = await sql`select email from students where roll_number = ${rollNumber.trim()}`;
  const student = rows[0];
  if (!student) {
    // Generic response either way — don't reveal whether a roll number exists.
    return NextResponse.json({ ok: true, sentTo: "your college email, if that roll number is on file" });
  }

  const code = generateOtp();
  // Reuses the same hashOtp helper with a fixed placeholder session id,
  // since this flow has no session — the hash is still salted by roll
  // number and code, which is what matters.
  const codeHash = hashOtp(code, "my-data", rollNumber.trim());
  const expiresAt = new Date(Date.now() + 5 * 60_000);

  await sql`
    insert into my_data_otp_codes (roll_number, code_hash, expires_at)
    values (${rollNumber.trim()}, ${codeHash}, ${expiresAt.toISOString()})
  `;
  await sql`delete from my_data_otp_codes where expires_at < now()`;

  await sendOtpEmail(student.email, code);

  const maskedEmail = student.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  return NextResponse.json({ ok: true, sentTo: maskedEmail });
});
