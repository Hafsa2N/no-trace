import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashOtp, hashRollNumber, generateAnonymousToken } from "@/lib/crypto";
import { withErrors } from "@/lib/api";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { isSessionOpen } from "@/lib/sessionWindow";

export const POST = withErrors(async (req: NextRequest) => {
  const { sessionId, rollNumber, code } = await req.json();
  if (!sessionId || !rollNumber || !code) {
    return NextResponse.json({ error: "sessionId, rollNumber and code required" }, { status: 400 });
  }

  // A 6-digit code is only 1,000,000 possibilities — with no attempt
  // limit, a script could brute-force it well within the 5-minute expiry.
  // Capped tighter than the request limit above since this guards the
  // actual secret, not just request volume.
  const okAttempts = await checkRateLimit(`otp-verify:${sessionId}:${rollNumber.trim()}`, 8, 15 * 60);
  if (!okAttempts) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
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

  // The OTP's own 5-minute expiry is a separate, shorter-lived thing from
  // the session's own window — a code requested seconds before the session
  // closed is still "unexpired" by its own clock for several more minutes,
  // but minting a token for an already-closed session would let feedback
  // be submitted after close with nothing left to stop it. Checked here,
  // not just at request time, since the two can legitimately disagree.
  const sessionRows = await sql`select opens_at, closes_at from sessions where id = ${sessionId}`;
  const session = sessionRows[0];
  if (!session || !isSessionOpen(session.opens_at, session.closes_at)) {
    return NextResponse.json({ error: "This feedback session has closed" }, { status: 403 });
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
