import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { withErrors } from "@/lib/api";

// Public, numbers-only, no auth — this is what closes the loop for a
// student right after they submit ("your rating vs. the class so far").
// Research on survey design consistently finds that showing respondents
// something back measurably increases future participation; a plain form
// tool has no way to do this because it has no analysis layer at all.
// Deliberately returns only per-question numeric averages, never a
// comment or a response count low enough to imply "you're the only one" —
// an average of ratings doesn't identify who gave which rating, unlike
// free-text comments (which is why those stay gated behind a minimum
// response count elsewhere in the app and these don't).
export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const rows = await sql`select ratings from responses where session_offering_id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ responseCount: 0, averages: {} });
  }

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const ratings = row.ratings as Record<string, number | string>;
    for (const [questionId, value] of Object.entries(ratings)) {
      // Multiple-choice answers land in this same jsonb column as strings —
      // skip them here, same as everywhere else averages are computed, so
      // one MCQ question doesn't poison every other question's average
      // with NaN once mixed into Object.values() downstream.
      if (typeof value !== "number") continue;
      sums[questionId] = (sums[questionId] ?? 0) + value;
      counts[questionId] = (counts[questionId] ?? 0) + 1;
    }
  }

  const averages: Record<string, number> = {};
  for (const questionId of Object.keys(sums)) {
    averages[questionId] = Math.round((sums[questionId] / counts[questionId]) * 10) / 10;
  }

  return NextResponse.json({ responseCount: rows.length, averages });
});
