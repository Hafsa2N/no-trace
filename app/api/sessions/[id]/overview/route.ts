import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getClassSessionOverview } from "@/lib/sessionAnalytics";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const overview = await getClassSessionOverview(id);
  if (!overview) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Faculty may only view the overview if they teach at least one subject
  // in this class session — and even then, they'll only see their own
  // offering in the UI, not classmates' subjects.
  if (session.role === "faculty" && !overview.offerings.some((o) => o.assignedFaculty === session.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(overview);
});
