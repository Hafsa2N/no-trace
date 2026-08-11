import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashOtp, hashRollNumber, generateAnonymousToken } from "@/lib/crypto";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const { sessionId, rollNumber, code } = await req.json();
  if (!sessionId || !rollNumber || !code) {
    return NextResponse.json({ error: "sessionId, rollNumber and code required" }, { status: 400 });
  }

  const codeHash = hashOtp(code, sessionId, rollNumber.trim());
  const otpRows = await sql`
    select id from otp_codes
    where session_id = ${sessionId} and roll_number = ${rollNumber.trim()}
      and code_hash = ${codeHash} and consumed = false and expires_at > now()
    order by created_at desc
    limit 1
  `;
  const otp = otpRows[0];
  if (!otp) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // The OTP has done its job (proving eligibility) — nothing after this
  // point needs the plaintext roll number. Delete it immediately rather
  // than leaving a roll-number-to-session link sitting in the database,
  // which would otherwise let anyone with DB access infer *whether* a
  // given student participated in a session (not what they said, but
  // participation itself is still a privacy leak worth closing).
  await sql`delete from otp_codes where session_id = ${sessionId} and roll_number = ${rollNumber.trim()}`;

  // Atomic, race-safe one-submission gate: the primary key on
  // (session_id, roll_number_hash) means only one of two concurrent
  // requests for the same student can ever succeed here.
  const rollHash = hashRollNumber(rollNumber.trim(), sessionId);
  const inserted = await sql`
    insert into session_participants (session_id, roll_number_hash)
    values (${sessionId}, ${rollHash})
    on conflict (session_id, roll_number_hash) do nothing
    returning session_id
  `;

  if (inserted.length === 0) {
    return NextResponse.json({ error: "You have already submitted feedback for this session" }, { status: 409 });
  }

  // From this point on there is no record connecting this student to
  // what follows — the token below carries only a session_id.
  const token = generateAnonymousToken();
  await sql`insert into tokens (token, session_id) values (${token}, ${sessionId})`;

  return NextResponse.json({ ok: true, token });
});
