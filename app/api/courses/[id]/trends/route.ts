import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getCourseTrends } from "@/lib/analysis/recurringIssues";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  // Cross-term, cross-section rollups are an institutional oversight view
  // (HOD/Principal), not a per-faculty one — admin only, same boundary as
  // the audit log.
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trends = await getCourseTrends(id);
  if (!trends) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json(trends);
});
