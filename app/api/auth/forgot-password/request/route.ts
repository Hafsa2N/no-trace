import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/crypto";
import { sendOtpEmail } from "@/lib/email";
import { withErrors } from "@/lib/api";
import { checkRateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

// Self-service password recovery for any staff account (admin or faculty)
// — same OTP-to-registered-email shape as the student flow. This is what
// lets an admin recover their own account without shell/DB access (once
// email delivery is configured), and lets faculty reset their own
// forgotten password without going through an admin.
export const POST = withErrors(async (req: NextRequest) => {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const okEmail = await checkRateLimit(`staff-reset-req:${email.trim().toLowerCase()}`, 5, 15 * 60);
  const okIp = await checkRateLimit(`staff-reset-req-ip:${clientIp(req)}`, 20, 60 * 60);
  if (!okEmail || !okIp) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const rows = await sql`select id, is_active from admins where email = ${email.trim()}`;
  const admin = rows[0];
  // Generic response either way — don't reveal whether an email is a
  // registered staff account, and don't tell a deactivated account's owner
  // that deactivation is the specific reason nothing arrives.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If that email belongs to a staff account, a reset code has been sent to it.",
  });
  if (!admin || !admin.is_active) return genericResponse;

  const code = generateOtp();
  const codeHash = hashOtp(code, "staff-reset", admin.id);
  const expiresAt = new Date(Date.now() + 5 * 60_000);

  await sql`
    insert into staff_reset_codes (admin_id, code_hash, expires_at)
    values (${admin.id}, ${codeHash}, ${expiresAt.toISOString()})
  `;
  await sql`delete from staff_reset_codes where expires_at < now()`;

  await sendOtpEmail(email.trim(), code);

  return genericResponse;
});
