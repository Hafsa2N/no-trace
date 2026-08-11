import { sql } from "@/lib/db";
import { aggregateThemes, THEMES, Theme } from "@/lib/analysis/themes";
import { MIN_RESPONSES_FOR_COMMENTS } from "@/lib/sessionAnalytics";

type TermBucket = {
  termId: string;
  termName: string;
  startsAt: string;
  commentCount: number;
  themeCounts: Record<Theme, number>;
};

export type ThemeTrend = {
  theme: Theme;
  timeline: { termName: string; pct: number | null; count: number; suppressed: boolean }[];
  termsAppeared: number;
  recurring: boolean;
  latestPct: number;
  previousPct: number | null;
  deltaPct: number | null;
  direction: "up" | "down" | "flat" | null;
  unresolved: boolean;
  narrative: string;
};

function buildNarrative(
  theme: Theme,
  appearedTermNames: string[],
  recurring: boolean,
  deltaPct: number | null,
  direction: ThemeTrend["direction"],
  unresolved: boolean
): string {
  const n = appearedTermNames.length;
  let s = `Students have mentioned "${theme}" in ${n} of the terms with enough responses to analyze (${appearedTermNames.join(", ")}).`;

  if (deltaPct !== null && direction === "up") {
    s += ` This came up ${deltaPct} percentage points more often than the previous term.`;
  } else if (deltaPct !== null && direction === "down") {
    s += ` This came up ${Math.abs(deltaPct)} percentage points less often than the previous term.`;
  } else if (deltaPct !== null) {
    s += ` The frequency has stayed roughly flat since the previous term.`;
  }

  // Resolution status is only a meaningful claim once a theme has actually
  // recurred — for a single-term mention there's nothing to compare
  // against and nothing to say it was or wasn't addressed.
  if (recurring) {
    s += unresolved
      ? ` No update tied to this course has been recorded since — there's no evidence this was acted on.`
      : ` An update tied to this course was recorded after this theme first came up.`;
  }

  return s;
}

/**
 * Cross-term theme analysis for one course. This is the piece Google
 * Forms/QR tools structurally can't do: it only works because sessions
 * resolve to a stable course_id and term_id instead of free-text fields
 * that drift semester to semester.
 */
export async function getCourseTrends(courseId: string) {
  const courseRows = await sql`select id, name, department from courses where id = ${courseId}`;
  const course = courseRows[0];
  if (!course) return null;

  // course_id now lives on session_offerings (one per subject), not on
  // sessions directly (one session can offer many subjects) — join
  // through it to find every term this course was actually taught in.
  const offeringRows = await sql`
    select so.id as offering_id, t.id as term_id, t.name as term_name, t.starts_at
    from session_offerings so
    join sessions s on s.id = so.session_id
    join terms t on t.id = s.term_id
    where so.course_id = ${courseId}
    order by t.starts_at asc
  `;

  const termOrder: { termId: string; termName: string; startsAt: string }[] = [];
  const offeringIdsByTerm = new Map<string, string[]>();
  for (const row of offeringRows) {
    if (!offeringIdsByTerm.has(row.term_id)) {
      offeringIdsByTerm.set(row.term_id, []);
      termOrder.push({ termId: row.term_id, termName: row.term_name, startsAt: row.starts_at });
    }
    offeringIdsByTerm.get(row.term_id)!.push(row.offering_id);
  }

  if (termOrder.length === 0) {
    return { course, terms: [], themes: [], totalComments: 0 };
  }

  const buckets: TermBucket[] = [];
  for (const { termId, termName, startsAt } of termOrder) {
    const offeringIds = offeringIdsByTerm.get(termId)!;
    const responses = await sql`
      select comment from responses
      where session_offering_id = any(${offeringIds})
        and comment_hidden = false
        and comment is not null
        and trim(comment) <> ''
    `;
    const comments = responses.map((r) => r.comment as string);
    buckets.push({ termId, termName, startsAt, commentCount: comments.length, themeCounts: aggregateThemes(comments) });
  }

  // Only updates tied to *this course specifically* count as a recorded
  // response — a generic department-wide or college-wide update doesn't
  // get credit for addressing one course's recurring issue.
  const updateRows = await sql`
    select created_at from updates where course_id = ${courseId} order by created_at asc
  `;

  const themeTrends: ThemeTrend[] = [];
  for (const theme of Object.keys(THEMES) as Theme[]) {
    const timeline = buckets.map((b) => {
      const suppressed = b.commentCount < MIN_RESPONSES_FOR_COMMENTS;
      return {
        termName: b.termName,
        pct: suppressed ? null : Math.round((b.themeCounts[theme] / b.commentCount) * 100),
        count: b.themeCounts[theme],
        suppressed,
      };
    });

    // Only count terms with enough responses to say anything meaningful —
    // same small-N protection used everywhere else in this app.
    const usableAppearances = timeline.filter((t) => !t.suppressed && t.count > 0);
    if (usableAppearances.length === 0) continue;

    const termsAppeared = usableAppearances.length;
    const recurring = termsAppeared >= 2;
    const latest = usableAppearances[usableAppearances.length - 1];
    const previous = usableAppearances.length >= 2 ? usableAppearances[usableAppearances.length - 2] : null;
    const deltaPct = previous && latest.pct !== null && previous.pct !== null ? latest.pct - previous.pct : null;
    const direction: ThemeTrend["direction"] =
      deltaPct === null ? null : deltaPct > 5 ? "up" : deltaPct < -5 ? "down" : "flat";

    const firstAppearanceTerm = termOrder.find((t) => t.termName === usableAppearances[0].termName);
    const hasRecordedResponse = updateRows.some(
      (u) => firstAppearanceTerm && new Date(u.created_at) > new Date(firstAppearanceTerm.startsAt)
    );
    const unresolved = recurring && !hasRecordedResponse;

    themeTrends.push({
      theme,
      timeline,
      termsAppeared,
      recurring,
      latestPct: latest.pct ?? 0,
      previousPct: previous?.pct ?? null,
      deltaPct,
      direction,
      unresolved,
      narrative: buildNarrative(
        theme,
        usableAppearances.map((a) => a.termName),
        recurring,
        deltaPct,
        direction,
        unresolved
      ),
    });
  }

  themeTrends.sort((a, b) => {
    if (a.unresolved !== b.unresolved) return a.unresolved ? -1 : 1;
    if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
    return b.latestPct - a.latestPct;
  });

  return {
    course,
    terms: termOrder.map((t) => t.termName),
    themes: themeTrends,
    totalComments: buckets.reduce((sum, b) => sum + b.commentCount, 0),
  };
}
