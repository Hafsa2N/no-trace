import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getCourseTrends } from "@/lib/analysis/recurringIssues";
import { withErrors } from "@/lib/api";

// A CSV of a course's cross-term trend analysis — the kind of longitudinal
// evidence an accreditation review (NAAC/NBA) or department meeting asks
// for, and exactly the artifact a QR-code-to-Google-Form setup has no way
// to produce, since it never resolves subjects to a stable course/term.
function toCsvField(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADERS = [
  "theme",
  "terms_appeared",
  "recurring",
  "latest_pct",
  "previous_pct",
  "delta_pct",
  "direction",
  "unresolved",
  "narrative",
];

export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trends = await getCourseTrends(id);
  if (!trends) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const lines = [HEADERS.join(",")];
  for (const t of trends.themes) {
    lines.push(
      [
        t.theme,
        t.termsAppeared,
        t.recurring,
        t.latestPct,
        t.previousPct ?? "",
        t.deltaPct ?? "",
        t.direction ?? "",
        t.unresolved,
        t.narrative,
      ]
        .map(toCsvField)
        .join(",")
    );
  }
  const csv = lines.join("\n");

  const filename = `${trends.course.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-trends.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
