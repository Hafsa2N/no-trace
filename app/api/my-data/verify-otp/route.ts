import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashOtp } from "@/lib/crypto";
import { signMyDataToken } from "@/lib/myDataAuth";
import { withErrors } from "@/lib/api";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const POST = withErrors(async (req: NextRequest) => {
  const { rollNumber, code } = await req.json();
  if (!rollNumber || !code) {
    return NextResponse.json({ error: "rollNumber and code required" }, { status: 400 });
  }

  const okAttempts = await checkRateLimit(`mydata-verify:${rollNumber.trim()}`, 8, 15 * 60);
  if (!okAttempts) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const codeHash = hashOtp(code, "my-data", rollNumber.trim());
  const rows = await sql`
    select id from my_data_otp_codes
    where roll_number = ${rollNumber.trim()} and code_hash = ${codeHash}
      and consumed = false and expires_at > now()
    order by created_at desc
    limit 1
  `;
  const otp = rows[0];
  if (!otp) return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

  await sql`delete from my_data_otp_codes where roll_number = ${rollNumber.trim()}`;

  const token = signMyDataToken(rollNumber.trim());
  return NextResponse.json({ ok: true, token });
});
