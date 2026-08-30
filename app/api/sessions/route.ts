import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { generatePasscode } from "@/lib/crypto";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";
import { resolveCourseId, resolveTermId } from "@/lib/courses";
import { defaultQuestions } from "@/lib/questionTemplates";
import { claimIdempotencyKey, storeIdempotencyResult, releaseIdempotencyKey } from "@/lib/idempotency";

type OfferingInput = { subject: string; assignedFaculty?: string | null };

export const POST = withErrors(async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    department,
    year,
    section,
    opensAt,
    durationMinutes,
    questions,
    offerings,
    termId,
    termName,
    termStartsAt,
    termEndsAt,
  }: {
    department: string;
    year: number;
    section: string;
    opensAt: string;
    durationMinutes: number;
    questions?: unknown;
    offerings: OfferingInput[];
    termId?: string;
    termName?: string;
    termStartsAt?: string;
    termEndsAt?: string;
  } = body;

  if (!department || !year || !section || !opensAt || !durationMinutes) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!termId && !(termName && termStartsAt && termEndsAt)) {
    return NextResponse.json({ error: "A term is required (pick one or create a new one)" }, { status: 400 });
  }
  if (!Array.isArray(offerings) || offerings.length === 0 || offerings.some((o) => !o.subject?.trim())) {
    return NextResponse.json({ error: "At least one subject is required" }, { status: 400 });
  }

  // A double-click or a retried network request must not create two
  // sessions for the same class — the client sends a fresh key per form
  // instance (lib/csrf-client.ts's counterpart, an Idempotency-Key header),
  // and it's claimed atomically the same way session_participants prevents
  // a duplicate student submission (Part 12 of the technical dossier).
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    const claim = await claimIdempotencyKey(idempotencyKey, session.id);
    if (claim.status === "duplicate") {
      return NextResponse.json(claim.responseBody as object);
    }
    if (claim.status === "in-progress") {
      return NextResponse.json({ error: "This request is already being processed" }, { status: 409 });
    }
  }

  try {
    const opens = new Date(opensAt);
    const closes = new Date(opens.getTime() + Number(durationMinutes) * 60_000);
    const passcode = generatePasscode();
    const resolvedTermId = termId || (await resolveTermId(termName!, termStartsAt!, termEndsAt!));

    const sessionRows = await sql`
      insert into sessions (department, year, section, passcode, questions, opens_at, closes_at, created_by, term_id)
      values (${department}, ${year}, ${section}, ${passcode},
              ${JSON.stringify(questions ?? defaultQuestions())}, ${opens.toISOString()}, ${closes.toISOString()}, ${session.id},
              ${resolvedTermId})
      returning id, passcode
    `;
    const sessionId = sessionRows[0].id;

    const createdOfferings = [];
    for (const offering of offerings) {
      const courseId = await resolveCourseId(offering.subject, department);
      // New offerings start unpublished to faculty — the admin explicitly
      // publishes once results are ready to share, rather than faculty
      // watching live results trickle in as students submit.
      const offeringRows = await sql`
        insert into session_offerings (session_id, course_id, assigned_faculty, results_published)
        values (${sessionId}, ${courseId}, ${offering.assignedFaculty || null}, false)
        returning id
      `;
      createdOfferings.push({ id: offeringRows[0].id, subject: offering.subject });
    }

    await logAction(session.id, "session.created", sessionId, {
      department,
      year,
      section,
      subjects: offerings.map((o) => o.subject),
    });

    const responseBody = { ok: true, session: { id: sessionId, passcode }, offerings: createdOfferings };
    if (idempotencyKey) await storeIdempotencyResult(idempotencyKey, responseBody);
    return NextResponse.json(responseBody);
  } catch (err) {
    if (idempotencyKey) await releaseIdempotencyKey(idempotencyKey);
    throw err;
  }
});

export const GET = withErrors(async () => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Faculty only ever see class sessions where they teach at least one
  // subject — never every session in the college.
  const rows =
    session.role === "faculty"
      ? await sql`
          select s.id, s.department, s.year, s.section, s.opens_at, s.closes_at,
                 (select count(*) from session_offerings so where so.session_id = s.id) as offering_count,
                 (select count(*) from session_participants sp where sp.session_id = s.id) as participant_count
          from sessions s
          where exists (select 1 from session_offerings so where so.session_id = s.id and so.assigned_faculty = ${session.id})
          order by s.created_at desc
        `
      : await sql`
          select s.id, s.department, s.year, s.section, s.opens_at, s.closes_at,
                 (select count(*) from session_offerings so where so.session_id = s.id) as offering_count,
                 (select count(*) from session_participants sp where sp.session_id = s.id) as participant_count
          from sessions s
          order by s.created_at desc
        `;

  return NextResponse.json({ sessions: rows });
});
