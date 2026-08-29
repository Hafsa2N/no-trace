import { sql } from "@/lib/db";
import { analyzeComments } from "@/lib/analysis";
import type { SessionQuestion } from "@/lib/questionTemplates";

// Small-N protection: don't surface individually-readable comments (or any
// analysis derived from them) until enough students have responded that no
// comment can be attributed by elimination. Reused by the cross-term
// recurring-issue detector for the same reason.
export const MIN_RESPONSES_FOR_COMMENTS = 5;

export type McqDistribution = {
  id: string;
  label: string;
  options: string[];
  counts: Record<string, number>;
  total: number;
};

// MCQ answers live in the same jsonb column as rating answers, distinguished
// only by value type (string vs number) — this pulls out just the string
// ones and tallies them per option. `options` comes from the session's own
// stored question list so a zero-count option still shows in the result,
// not just whichever options someone actually picked.
function computeMcqDistributions(
  rows: { ratings: Record<string, unknown> }[],
  questions: SessionQuestion[]
): McqDistribution[] {
  const mcqQuestions = questions.filter((q) => q.type === "mcq");
  if (mcqQuestions.length === 0) return [];

  return mcqQuestions.map((q) => {
    const counts: Record<string, number> = Object.fromEntries((q.options ?? []).map((o) => [o, 0]));
    let total = 0;
    for (const row of rows) {
      const value = row.ratings?.[q.id];
      if (typeof value !== "string") continue;
      counts[value] = (counts[value] ?? 0) + 1;
      total += 1;
    }
    return { id: q.id, label: q.label, options: q.options ?? [], counts, total };
  });
}

export type ExtraTextAnswers = {
  id: string;
  label: string;
  texts: string[];
  analysis: ReturnType<typeof analyzeComments> | null;
};

// A subject can carry more than one free-text question — "comment" (the
// default) keeps going through the existing single-column pipeline for
// backward compatibility; anything else lands here instead, gated by the
// exact same small-N threshold so an extra question never becomes a
// second, less-protected way to identify someone by elimination.
function computeExtraTextAnswers(
  rows: { ratings: Record<string, unknown> }[],
  questions: SessionQuestion[],
  unlocked: boolean
): ExtraTextAnswers[] {
  const extraTextQuestions = questions.filter((q) => q.type === "text" && q.id !== "comment");
  if (extraTextQuestions.length === 0) return [];

  return extraTextQuestions.map((q) => {
    const texts = unlocked
      ? rows
          .map((r) => r.ratings?.[q.id])
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
    return { id: q.id, label: q.label, texts, analysis: texts.length > 0 ? analyzeComments(texts) : null };
  });
}

export type ConstructResult = {
  name: string;
  average: number;
  items: { id: string; label: string; average: number }[];
};

// Collapses questions tagged with the same `construct` name into one
// combined score (mean of the member questions' own averages) — the
// multi-item measurement pattern: three differently-worded questions on
// "clarity" average out one another's noise into a single steadier
// number, the same approach validated teaching-evaluation instruments
// (e.g. SEEQ) use. Ungrouped rating questions pass through unchanged.
// `dimensionAverages` is what the insight generator and "weakest vs
// strongest" comparisons should read — it's what keeps a 3-item
// construct from crowding out every other dimension by count alone.
function groupConstructs(averages: Record<string, number>, questions: SessionQuestion[]) {
  const byConstruct = new Map<string, { id: string; label: string; average: number }[]>();
  const grouped = new Set<string>();
  for (const q of questions) {
    if (q.type !== "rating" || !q.construct) continue;
    const avg = averages[q.id];
    if (avg === undefined) continue;
    grouped.add(q.id);
    const list = byConstruct.get(q.construct) ?? [];
    list.push({ id: q.id, label: q.label, average: avg });
    byConstruct.set(q.construct, list);
  }

  const constructs: ConstructResult[] = Array.from(byConstruct.entries()).map(([name, items]) => ({
    name,
    average: Math.round((items.reduce((a, i) => a + i.average, 0) / items.length) * 100) / 100,
    items,
  }));

  const ungroupedAverages: Record<string, number> = {};
  for (const [key, value] of Object.entries(averages)) {
    if (!grouped.has(key)) ungroupedAverages[key] = value;
  }

  const dimensionAverages: Record<string, number> = { ...ungroupedAverages };
  for (const c of constructs) dimensionAverages[c.name] = c.average;

  return { constructs, ungroupedAverages, dimensionAverages };
}

/**
 * One faculty member's performance across every subject and term they've
 * ever been assigned — the view an admin (or the faculty member) needs to
 * answer "how is this person doing overall," not just "how did this one
 * class go." Courses are ranked by average so the weakest and strongest
 * are immediately visible, not buried in a chronological list.
 */
export async function getFacultyAnalysis(facultyId: string) {
  const rows = await sql`
    select so.id as offering_id, c.name as course_name, s.department, s.year, s.section, t.name as term_name,
           r.ratings
    from session_offerings so
    join sessions s on s.id = so.session_id
    left join courses c on c.id = so.course_id
    left join terms t on t.id = s.term_id
    left join responses r on r.session_offering_id = so.id
    where so.assigned_faculty = ${facultyId}
    order by t.starts_at asc nulls last
  `;

  type CourseAgg = { offeringId: string; courseName: string; department: string; year: number; section: string; termName: string | null; sum: number; count: number; responseCount: number };
  const byOffering = new Map<string, CourseAgg>();
  for (const row of rows) {
    const entry = byOffering.get(row.offering_id) ?? {
      offeringId: row.offering_id as string,
      courseName: (row.course_name as string | null) ?? "(untitled subject)",
      department: row.department as string,
      year: row.year as number,
      section: row.section as string,
      termName: row.term_name as string | null,
      sum: 0,
      count: 0,
      responseCount: 0,
    };
    if (row.ratings) {
      const values = Object.values(row.ratings as Record<string, number>).filter((v) => typeof v === "number");
      entry.sum += values.reduce((a, b) => a + b, 0);
      entry.count += values.length;
      entry.responseCount += 1;
    }
    byOffering.set(row.offering_id, entry);
  }

  const offerings = Array.from(byOffering.values()).map((o) => ({
    offeringId: o.offeringId,
    courseName: o.courseName,
    department: o.department,
    year: o.year,
    section: o.section,
    termName: o.termName,
    responseCount: o.responseCount,
    average: o.count > 0 ? Math.round((o.sum / o.count) * 100) / 100 : null,
  }));

  const withData = offerings.filter((o) => o.average !== null);
  const overallAverage =
    withData.length > 0 ? Math.round((withData.reduce((a, o) => a + (o.average as number), 0) / withData.length) * 100) / 100 : null;
  const totalResponses = offerings.reduce((a, o) => a + o.responseCount, 0);

  const ranked = [...withData].sort((a, b) => (a.average as number) - (b.average as number));

  return {
    offerings,
    overallAverage,
    totalResponses,
    strongest: ranked.length > 0 ? ranked[ranked.length - 1] : null,
    weakest: ranked.length > 0 ? ranked[0] : null,
  };
}

// Deliberately named "evidence level," not "confidence" — this is a
// response-rate threshold read off published research, not a computed
// statistical confidence interval (no variance or sample-size math happens
// here). Calling it "confidence" would overstate what it is: a rule of
// thumb about how much weight a response rate can bear, not a probability.
export type EvidenceLevel = "high" | "moderate" | "low";

// Thresholds from actual research on course-evaluation response bias, not a
// guess: response rates under 40% show significantly lower mean scores than
// 50-75%, and under 66% introduces meaningful sampling bias. See
// ResearchGate "What response rates are needed to make reliable inferences
// from student evaluations of teaching?" and the non-response-bias
// literature in ScienceDirect (Vol. 44, 2015).
export function getEvidenceLevel(rate: number | null): EvidenceLevel | null {
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
    select so.id, so.course_id, so.assigned_faculty, so.results_published, c.name as course_name, a.email as faculty_email, a.name as faculty_name,
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
      facultyName: o.faculty_name as string | null,
      responseCount: Number(o.response_count),
      resultsPublished: o.results_published as boolean,
    })),
    eligibleCount,
    participantCount,
    responseRate: eligibleCount > 0 ? Math.round((participantCount / eligibleCount) * 100) : null,
    evidenceLevel: getEvidenceLevel(eligibleCount > 0 ? (participantCount / eligibleCount) * 100 : null),
  };
}

/**
 * Class-wide analysis — every response across every subject in this class
 * session, aggregated into one picture. Distinct from the per-offering
 * view: this answers "how did the class session go overall" rather than
 * "how did one subject go," which is what an admin actually wants to see
 * first when opening a closed session, not a QR code for a form that's no
 * longer accepting input.
 */
export async function getClassAnalysis(sessionId: string) {
  const sessionRows = await sql`select questions from sessions where id = ${sessionId}`;
  const questions = (sessionRows[0]?.questions as SessionQuestion[] | undefined) ?? [];

  const rows = await sql`
    select r.ratings, r.comment, r.comment_hidden
    from responses r
    join session_offerings so on so.id = r.session_offering_id
    where so.session_id = ${sessionId}
  `;

  const mcqDistributions = computeMcqDistributions(rows as { ratings: Record<string, unknown> }[], questions);

  const averages: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.ratings as Record<string, number>)) {
      if (typeof value !== "number") continue;
      averages[key] = (averages[key] ?? 0) + value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  for (const key of Object.keys(averages)) {
    averages[key] = Math.round((averages[key] / counts[key]) * 100) / 100;
  }
  const overallValues = Object.values(averages);
  const overallAverage = overallValues.length > 0 ? Math.round((overallValues.reduce((a, b) => a + b, 0) / overallValues.length) * 100) / 100 : null;

  const { constructs, ungroupedAverages, dimensionAverages } = groupConstructs(averages, questions);

  const comments = rows.filter((r) => !r.comment_hidden && r.comment && String(r.comment).trim()).map((r) => r.comment as string);
  const commentsUnlocked = rows.length >= MIN_RESPONSES_FOR_COMMENTS;
  const analysis = commentsUnlocked && comments.length > 0 ? analyzeComments(comments) : null;

  return {
    responseCount: rows.length,
    averages,
    overallAverage,
    analysis,
    commentsWithheld: rows.length > 0 && !commentsUnlocked,
    mcqDistributions,
    constructs,
    ungroupedAverages,
    dimensionAverages,
  };
}

/** Analytics for one subject offering — same shape as before, just scoped one level down. */
export async function getOfferingAnalytics(offeringId: string) {
  const offeringRows = await sql`
    select so.*, s.department, s.year, s.section, s.opens_at, s.closes_at, s.questions, c.name as course_name,
           a.email as faculty_email, a.name as faculty_name
    from session_offerings so
    join sessions s on s.id = so.session_id
    left join courses c on c.id = so.course_id
    left join admins a on a.id = so.assigned_faculty
    where so.id = ${offeringId}
  `;
  const offering = offeringRows[0];
  if (!offering) return null;
  const questions = (offering.questions as SessionQuestion[] | undefined) ?? [];

  const responses = await sql`
    select id, ratings, comment, comment_hidden from responses where session_offering_id = ${offeringId}
  `;
  const mcqDistributions = computeMcqDistributions(responses as { ratings: Record<string, unknown> }[], questions);

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
  const { constructs, ungroupedAverages, dimensionAverages } = groupConstructs(averages, questions);

  const commentsUnlocked = responses.length >= MIN_RESPONSES_FOR_COMMENTS;
  const textQuestionIds = new Set(questions.filter((q) => q.type === "text").map((q) => q.id));
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

  // Staff-hidden comments, for the admin review/unhide UI — same
  // commentsUnlocked gate as every other free-text surface, so hidden text
  // isn't a side channel around the small-N protection.
  const hiddenCommentRecords = commentsUnlocked
    ? responses
        .filter((r) => r.comment_hidden && r.comment && String(r.comment).trim())
        .map((r) => ({ id: r.id as string, text: r.comment as string }))
    : [];
  const extraTextAnswers = computeExtraTextAnswers(responses as { ratings: Record<string, unknown> }[], questions, commentsUnlocked);

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
      facultyEmail: offering.faculty_email as string | null,
      facultyName: offering.faculty_name as string | null,
      resultsPublished: offering.results_published as boolean,
    },
    responseCount: responses.length,
    eligibleCount,
    responseRate: eligibleCount > 0 ? Math.round((responses.length / eligibleCount) * 100) : null,
    evidenceLevel: getEvidenceLevel(eligibleCount > 0 ? (responses.length / eligibleCount) * 100 : null),
    averages,
    comments,
    commentRecords,
    hiddenCommentCount,
    hiddenCommentRecords,
    commentsWithheld: responses.length > 0 && !commentsUnlocked,
    minResponsesForComments: MIN_RESPONSES_FOR_COMMENTS,
    analysis: comments.length > 0 ? analyzeComments(comments) : null,
    questions,
    mcqDistributions,
    extraTextAnswers,
    constructs,
    ungroupedAverages,
    dimensionAverages,
    // Every individual response's numeric ratings, for the detailed report's
    // raw-response table. Rating/MCQ answers are safe to show at any N — a
    // bare number or option pick carries no free text and was never
    // linkable to a student in the first place. Free text is a different
    // story: gated by the same commentsUnlocked threshold as everywhere
    // else, and applied here — to both the dedicated `comment` field and
    // any other free-text question id embedded in `ratings` — rather than
    // left to whichever page renders this, so every caller (including the
    // JSON API route, not just the two report pages) gets the small-N
    // protection automatically instead of having to remember to re-check it.
    rawResponses: responses.map((r) => {
      const rawRatings = r.ratings as Record<string, number | string>;
      const ratings = commentsUnlocked
        ? rawRatings
        : Object.fromEntries(Object.entries(rawRatings).filter(([key]) => !textQuestionIds.has(key)));
      return {
        id: r.id as string,
        ratings,
        comment: commentsUnlocked && !r.comment_hidden && r.comment ? (r.comment as string) : null,
      };
    }),
  };
}

/**
 * One faculty member's own average rating for one course, across every
 * term they've taught it — the "am I improving" view, not a single term's
 * scorecard. Reframes analytics as something for faculty to track their
 * own growth with, not just a number an admin judges them on once.
 */
export async function getFacultyCourseTrend(courseId: string | null, facultyId: string | null, excludeOfferingId: string) {
  if (!courseId || !facultyId) return [];

  const rows = await sql`
    select so.id as offering_id, t.id as term_id, t.name as term_name, t.starts_at,
           r.ratings
    from session_offerings so
    join sessions s on s.id = so.session_id
    join terms t on t.id = s.term_id
    left join responses r on r.session_offering_id = so.id
    where so.course_id = ${courseId} and so.assigned_faculty = ${facultyId}
    order by t.starts_at asc
  `;

  const byTerm = new Map<string, { termName: string; startsAt: string; sum: number; count: number }>();
  for (const row of rows) {
    if (!row.ratings) continue;
    const entry = byTerm.get(row.term_id) ?? { termName: row.term_name, startsAt: row.starts_at, sum: 0, count: 0 };
    const values = Object.values(row.ratings as Record<string, number>).filter((v) => typeof v === "number");
    entry.sum += values.reduce((a, b) => a + b, 0);
    entry.count += values.length;
    byTerm.set(row.term_id, entry);
  }

  return Array.from(byTerm.values())
    .filter((t) => t.count > 0)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((t) => ({ label: t.termName, value: Math.round((t.sum / t.count / 5) * 1000) / 10 })); // as a % of the 5-point scale
}

/**
 * The admin-side equivalent of getFacultyCourseTrend: this course's average
 * rating by term across every offering (any section, any faculty) — the
 * "is this course improving overall" view an admin needs, as distinct from
 * one faculty member's own trajectory teaching it. Same shape and same
 * 5-point-scale-as-percent convention so it can share the TrendLine component.
 */
export async function getCourseTermTrend(courseId: string | null) {
  if (!courseId) return [];

  const rows = await sql`
    select t.id as term_id, t.name as term_name, t.starts_at, r.ratings
    from session_offerings so
    join sessions s on s.id = so.session_id
    join terms t on t.id = s.term_id
    left join responses r on r.session_offering_id = so.id
    where so.course_id = ${courseId}
    order by t.starts_at asc
  `;

  const byTerm = new Map<string, { termName: string; startsAt: string; sum: number; count: number }>();
  for (const row of rows) {
    if (!row.ratings) continue;
    const entry = byTerm.get(row.term_id) ?? { termName: row.term_name, startsAt: row.starts_at, sum: 0, count: 0 };
    const values = Object.values(row.ratings as Record<string, number>).filter((v) => typeof v === "number");
    entry.sum += values.reduce((a, b) => a + b, 0);
    entry.count += values.length;
    byTerm.set(row.term_id, entry);
  }

  return Array.from(byTerm.values())
    .filter((t) => t.count > 0)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((t) => ({ label: t.termName, value: Math.round((t.sum / t.count / 5) * 1000) / 10 }));
}

// A term's point is exactly one of these — never a bare null with two
// different reasons collapsed into it. "no_sessions_in_term" can't actually
// occur here (the query only visits terms that have a session with this
// course), kept as a named case anyway so every caller's switch is
// exhaustive rather than assuming null always means the same thing.
export type ResponseRatePointStatus = "ok" | "suppressed" | "no_eligible_data";

export type ResponseRatePoint = {
  termName: string;
  offeringCount: number;
  responses: number;
  eligible: number;
  rate: number | null;
  status: ResponseRatePointStatus;
};

// Same 5-eligible-student floor used everywhere else small cohorts are
// protected (department/course rollups, comment gating) — a term where the
// pooled eligible count across every section is still under this floor
// would otherwise expose an exact rate for a near-identifiable group.
// Pooling first, then checking the *pooled* total against this floor, is
// what keeps a small section from being suppressed on its own only to
// become reconstructable by subtracting the visible larger sections from a
// visible pooled total — here there is no per-section number ever shown,
// so there is nothing to subtract.
const MIN_ELIGIBLE_FOR_RATE = 5;

/**
 * This course's response rate by term, pooled across every section and
 * faculty who've taught it — participation over time, not the rating trend
 * above. Pooled as total responses ÷ total eligible across all offerings in
 * the term, never as an average of each section's own percentage: averaging
 * percentages would silently weight a 5-student section the same as a
 * 60-student one, which is not what "this course's response rate" means.
 */
export async function getCourseResponseRateTrend(courseId: string | null): Promise<ResponseRatePoint[]> {
  if (!courseId) return [];

  const rows = await sql`
    select t.id as term_id, t.name as term_name, t.starts_at, so.id as offering_id,
           (select count(*) from responses r where r.session_offering_id = so.id) as responses,
           (select count(*) from students st
            where st.department = s.department and st.year = s.year and st.section = s.section) as eligible
    from session_offerings so
    join sessions s on s.id = so.session_id
    join terms t on t.id = s.term_id
    where so.course_id = ${courseId}
  `;

  const byTerm = new Map<string, { termName: string; startsAt: string; offeringIds: Set<string>; responses: number; eligible: number }>();
  for (const row of rows) {
    const entry = byTerm.get(row.term_id) ?? { termName: row.term_name as string, startsAt: row.starts_at as string, offeringIds: new Set<string>(), responses: 0, eligible: 0 };
    entry.offeringIds.add(row.offering_id as string);
    entry.responses += Number(row.responses);
    entry.eligible += Number(row.eligible);
    byTerm.set(row.term_id, entry);
  }

  return Array.from(byTerm.values())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((t) => {
      // Two different reasons a term can end up without a rate, kept
      // distinct rather than both collapsing to "not enough data": zero
      // eligible students usually means the roster was never uploaded for
      // that department/year/section — a data gap, not a privacy case.
      // Below-floor-but-nonzero is the actual privacy suppression.
      const status: ResponseRatePointStatus = t.eligible === 0 ? "no_eligible_data" : t.eligible < MIN_ELIGIBLE_FOR_RATE ? "suppressed" : "ok";
      return {
        termName: t.termName,
        offeringCount: t.offeringIds.size,
        responses: t.responses,
        eligible: t.eligible,
        rate: status === "ok" ? Math.round((t.responses / t.eligible) * 100) : null,
        status,
      };
    });
}

export type InstitutionRatePoint = {
  termName: string;
  sessionCount: number;
  participants: number;
  eligible: number;
  rate: number | null;
  status: ResponseRatePointStatus;
};

/**
 * The whole institution's response rate by term — participation, not
 * course-level rating. Deliberately built from session_participants (one
 * row per student who verified for a class session) against eligible
 * students, exactly the same participation-rate definition the dashboard's
 * own headline number already uses — never from `responses`, which would
 * double- or triple-count a single student once per subject they rated in
 * a multi-subject class session and produce a rate that could exceed 100%.
 */
export async function getInstitutionResponseRateTrend(): Promise<InstitutionRatePoint[]> {
  const rows = await sql`
    select t.id as term_id, t.name as term_name, t.starts_at, s.id as session_id,
           (select count(*) from session_participants sp where sp.session_id = s.id) as participants,
           (select count(*) from students st
            where st.department = s.department and st.year = s.year and st.section = s.section) as eligible
    from sessions s
    join terms t on t.id = s.term_id
  `;

  const byTerm = new Map<string, { termName: string; startsAt: string; sessionIds: Set<string>; participants: number; eligible: number }>();
  for (const row of rows) {
    const entry = byTerm.get(row.term_id) ?? { termName: row.term_name as string, startsAt: row.starts_at as string, sessionIds: new Set<string>(), participants: 0, eligible: 0 };
    entry.sessionIds.add(row.session_id as string);
    entry.participants += Number(row.participants);
    entry.eligible += Number(row.eligible);
    byTerm.set(row.term_id, entry);
  }

  return Array.from(byTerm.values())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((t) => {
      const status: ResponseRatePointStatus = t.eligible === 0 ? "no_eligible_data" : t.eligible < MIN_ELIGIBLE_FOR_RATE ? "suppressed" : "ok";
      return {
        termName: t.termName,
        sessionCount: t.sessionIds.size,
        participants: t.participants,
        eligible: t.eligible,
        rate: status === "ok" ? Math.round((t.participants / t.eligible) * 100) : null,
        status,
      };
    });
}
