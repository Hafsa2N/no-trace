import { sql } from "@/lib/db";
import { analyzeComments } from "@/lib/analysis";

// Small-N protection: don't surface individually-readable comments (or any
// analysis derived from them) until enough students have responded that no
// comment can be attributed by elimination. Reused by the cross-term
// recurring-issue detector for the same reason.
export const MIN_RESPONSES_FOR_COMMENTS = 5;

export type ResponseConfidence = "high" | "moderate" | "low";

// Thresholds from actual research on course-evaluation response bias, not a
// guess: response rates under 40% show significantly lower mean scores than
// 50-75%, and under 66% introduces meaningful sampling bias. See
// ResearchGate "What response rates are needed to make reliable inferences
// from student evaluations of teaching?" and the non-response-bias
// literature in ScienceDirect (Vol. 44, 2015).
export function getResponseConfidence(rate: number | null): ResponseConfidence | null {
  if (rate === null) return null;
  if (rate >= 66) return "high";
  if (rate >= 40) return "moderate";
  return "low";
}

/**
 * A class session's overview: every subject offered to that class, who
 * teaches it, and how many students in the class actually participated —
 * measured once at the class level (one verification), not summed across
 * subjects (which would double/triple count the same student).
 */
export async function getClassSessionOverview(sessionId: string) {
  const sessionRows = await sql`select * from sessions where id = ${sessionId}`;
  const session = sessionRows[0];
  if (!session) return null;

  const offeringRows = await sql`
    select so.id, so.course_id, so.assigned_faculty, c.name as course_name, a.email as faculty_email,
           (select count(*) from responses r where r.session_offering_id = so.id) as response_count
    from session_offerings so
    left join courses c on c.id = so.course_id
    left join admins a on a.id = so.assigned_faculty
    where so.session_id = ${sessionId}
    order by c.name
  `;

  const eligibleRows = await sql`
    select count(*) as count from students
    where department = ${session.department} and year = ${session.year} and section = ${session.section}
  `;
  const eligibleCount = Number(eligibleRows[0].count);

  const participantRows = await sql`
    select count(*) as count from session_participants where session_id = ${sessionId}
  `;
  const participantCount = Number(participantRows[0].count);

  return {
    session: {
      id: session.id,
      department: session.department,
      year: session.year,
      section: session.section,
      passcode: session.passcode,
      opensAt: session.opens_at,
      closesAt: session.closes_at,
    },
    offerings: offeringRows.map((o) => ({
      id: o.id as string,
      courseId: o.course_id as string | null,
      courseName: (o.course_name as string | null) ?? "(untitled subject)",
      assignedFaculty: o.assigned_faculty as string | null,
      facultyEmail: o.faculty_email as string | null,
      responseCount: Number(o.response_count),
    })),
    eligibleCount,
    participantCount,
    responseRate: eligibleCount > 0 ? Math.round((participantCount / eligibleCount) * 100) : null,
    responseConfidence: getResponseConfidence(eligibleCount > 0 ? (participantCount / eligibleCount) * 100 : null),
  };
}

/** Analytics for one subject offering — same shape as before, just scoped one level down. */
export async function getOfferingAnalytics(offeringId: string) {
  const offeringRows = await sql`
    select so.*, s.department, s.year, s.section, s.opens_at, s.closes_at, c.name as course_name
    from session_offerings so
    join sessions s on s.id = so.session_id
    left join courses c on c.id = so.course_id
    where so.id = ${offeringId}
  `;
  const offering = offeringRows[0];
  if (!offering) return null;

  const responses = await sql`
    select id, ratings, comment, comment_hidden from responses where session_offering_id = ${offeringId}
  `;

  const eligibleRows = await sql`
    select count(*) as count from students
    where department = ${offering.department} and year = ${offering.year} and section = ${offering.section}
  `;
  const eligibleCount = Number(eligibleRows[0].count);

  const averages: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const row of responses) {
    for (const [key, value] of Object.entries(row.ratings as Record<string, number>)) {
      if (typeof value !== "number") continue;
      averages[key] = (averages[key] ?? 0) + value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  for (const key of Object.keys(averages)) {
    averages[key] = Math.round((averages[key] / counts[key]) * 100) / 100;
  }

  const commentsUnlocked = responses.length >= MIN_RESPONSES_FOR_COMMENTS;
  const visibleCommentRows = responses.filter(
    (r) => !r.comment_hidden && r.comment && String(r.comment).trim()
  );
  const hiddenCommentCount = responses.filter(
    (r) => r.comment_hidden && r.comment && String(r.comment).trim()
  ).length;

  const commentRecords = commentsUnlocked
    ? visibleCommentRows.map((r) => ({ id: r.id as string, text: r.comment as string }))
    : [];
  const comments = commentRecords.map((c) => c.text);

  return {
    offering: {
      id: offering.id,
      sessionId: offering.session_id as string,
      courseId: offering.course_id as string | null,
      courseName: (offering.course_name as string | null) ?? "(untitled subject)",
      department: offering.department as string,
      year: offering.year as number,
      section: offering.section as string,
      assignedFaculty: offering.assigned_faculty as string | null,
    },
    responseCount: responses.length,
    eligibleCount,
    responseRate: eligibleCount > 0 ? Math.round((responses.length / eligibleCount) * 100) : null,
    responseConfidence: getResponseConfidence(eligibleCount > 0 ? (responses.length / eligibleCount) * 100 : null),
    averages,
    comments,
    commentRecords,
    hiddenCommentCount,
    commentsWithheld: responses.length > 0 && !commentsUnlocked,
    minResponsesForComments: MIN_RESPONSES_FOR_COMMENTS,
    analysis: comments.length > 0 ? analyzeComments(comments) : null,
  };
}
