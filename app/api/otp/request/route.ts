import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateOtp, hashOtp, hashRollNumber } from "@/lib/crypto";
import { sendOtpEmail } from "@/lib/email";
import { withErrors } from "@/lib/api";
import { checkRateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { isSessionOpen } from "@/lib/sessionWindow";

export const POST = withErrors(async (req: NextRequest) => {
  const { sessionId, rollNumber, passcode, consent } = await req.json();
  if (!sessionId || !rollNumber || !passcode) {
    return NextResponse.json({ error: "sessionId, rollNumber and passcode required" }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json({ error: "You must acknowledge the privacy notice to continue" }, { status: 400 });
  }

  // Per-student: stops one roll number's inbox being spammed with codes —
  // this is the real protection, scoped to an identity, not a network.
  // Per-IP: a much looser secondary check against one caller scripting
  // through many different roll numbers. Deliberately high — an entire
  // class (60+ students) submitting from the same campus WiFi/NAT shares
  // one public IP, and a low cap here would lock out real students partway
  // through a normal session, not just block an attacker. (Caught in
  // testing: 20/hour was low enough to do exactly that.)
  const okStudent = await checkRateLimit(`otp-req:${sessionId}:${rollNumber.trim()}`, 5, 15 * 60);
  const okIp = await checkRateLimit(`otp-req-ip:${clientIp(req)}`, 300, 60 * 60);
  if (!okStudent || !okIp) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const sessionRows = await sql`select * from sessions where id = ${sessionId}`;
  const session = sessionRows[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // The passcode is shown openly alongside the QR code — it isn't a secret
  // from students, it's a "you got this from the actual class" gate (a
  // student would need to have seen the shared screen/handout, not just
  // guessed a roll number). Checked before the eligibility lookup so a
  // wrong passcode never even touches the roster.
  if (String(passcode).trim().toUpperCase() !== session.passcode) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 403 });
  }

  if (!isSessionOpen(session.opens_at, session.closes_at)) {
    return NextResponse.json({ error: "This feedback session is not currently open" }, { status: 403 });
  }

  const studentRows = await sql`select * from students where roll_number = ${rollNumber.trim()}`;
  const student = studentRows[0];
  if (
    !student ||
    student.department !== session.department ||
    student.year !== session.year ||
    student.section !== session.section
  ) {
    // Deliberately generic — don't reveal *why* to avoid leaking roster details.
    return NextResponse.json({ error: "You are not eligible for this session" }, { status: 403 });
  }

  const rollHash = hashRollNumber(rollNumber.trim(), sessionId);
  const already = await sql`
    select 1 from session_participants where session_id = ${sessionId} and roll_number_hash = ${rollHash}
  `;
  if (already.length > 0) {
    return NextResponse.json({ error: "You have already submitted feedback for this session" }, { status: 409 });
  }

  // Record consent once, the first time this student actively agrees —
  // not at roster upload, which is the college's enrollment record, not
  // this student's individual say-so. Required under India's DPDP Act.
  if (!student.consent_given_at) {
    await sql`update students set consent_given_at = now() where roll_number = ${rollNumber.trim()}`;
  }

  const code = generateOtp();
  const codeHash = hashOtp(code, sessionId, rollNumber.trim());
  const expiresAt = new Date(Date.now() + 5 * 60_000);

  await sql`
    insert into otp_codes (session_id, roll_number, code_hash, expires_at)
    values (${sessionId}, ${rollNumber.trim()}, ${codeHash}, ${expiresAt.toISOString()})
  `;

  // Opportunistic garbage collection: a student who requests a code but
  // never completes verification would otherwise leave a plaintext
  // roll-number-to-session record sitting around indefinitely. There's no
  // background job infrastructure here, so piggyback the cleanup on the
  // next request instead.
  await sql`delete from otp_codes where expires_at < now()`;

  await sendOtpEmail(student.email, code);

  // Mask the email so the UI can confirm where the code went without
  // exposing the full address to anyone watching the screen.
  const maskedEmail = student.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
  return NextResponse.json({ ok: true, sentTo: maskedEmail });
});
