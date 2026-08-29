import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { withErrors } from "@/lib/api";
import { isSessionOpen } from "@/lib/sessionWindow";

type Submission = { offeringId: string; ratings: Record<string, number | string>; comment?: string | null };

export const POST = withErrors(async (req: NextRequest) => {
  const { token, sessionId, submissions } = (await req.json()) as {
    token: string;
    sessionId: string;
    submissions: Submission[];
  };
  if (!token || !sessionId || !Array.isArray(submissions) || submissions.length === 0) {
    return NextResponse.json({ error: "token, sessionId and submissions required" }, { status: 400 });
  }

  // The token itself carries no expiry — sessions.closes_at is the one
  // canonical boundary, checked here rather than duplicated onto the token,
  // so there is exactly one place "is this session still open" can ever
  // disagree with itself. Without this check, a token minted while the
  // session was open could be redeemed at any point afterward — hours,
  // days, indefinitely — since nothing else in the redemption path is
  // time-bound.
  const sessionRows = await sql`select opens_at, closes_at from sessions where id = ${sessionId}`;
  const sessionRow = sessionRows[0];
  if (!sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!isSessionOpen(sessionRow.opens_at, sessionRow.closes_at)) {
    return NextResponse.json({ error: "This feedback session has closed" }, { status: 403 });
  }

  // Validate every offering actually belongs to this class session *before*
  // touching the token — a bad offeringId should fail cleanly, not burn
  // the student's one-time token first.
  const offeringRows = await sql`
    select id from session_offerings where session_id = ${sessionId} and id = any(${submissions.map((s) => s.offeringId)})
  `;
  const validOfferingIds = new Set(offeringRows.map((r) => r.id as string));
  if (submissions.some((s) => !validOfferingIds.has(s.offeringId))) {
    return NextResponse.json({ error: "One or more subjects don't belong to this session" }, { status: 400 });
  }

  // Atomic redeem: flips used=false -> true only if it's still false, so a
  // retried/duplicated request can never insert responses twice for one
  // token, no matter how many subjects are in the combined submission.
  const redeemed = await sql`
    update tokens set used = true, used_at = now()
    where token = ${token} and session_id = ${sessionId} and used = false
    returning token
  `;

  if (redeemed.length === 0) {
    return NextResponse.json({ error: "Invalid or already-used token" }, { status: 409 });
  }

  for (const s of submissions) {
    await sql`
      insert into responses (session_offering_id, ratings, comment)
      values (${s.offeringId}, ${JSON.stringify(s.ratings)}, ${s.comment ?? null})
    `;
  }

  return NextResponse.json({ ok: true, submitted: submissions.length });
});
