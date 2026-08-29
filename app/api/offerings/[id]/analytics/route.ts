import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getOfferingAnalytics } from "@/lib/sessionAnalytics";
import { withErrors } from "@/lib/api";

export const GET = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const analytics = await getOfferingAnalytics(id);
  if (!analytics) return NextResponse.json({ error: "Offering not found" }, { status: 404 });

  if (session.role === "faculty" && analytics.offering.assignedFaculty !== session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Same gate the offering detail page enforces before rendering anything —
  // an admin can review results before releasing them to faculty, and that
  // has to hold here too, not just in the page component. Without this, a
  // faculty account could call this route directly and see results the
  // admin has deliberately not shared yet.
  if (session.role === "faculty" && !analytics.offering.resultsPublished) {
    return NextResponse.json({ error: "Results not shared yet" }, { status: 403 });
  }

  return NextResponse.json(analytics);
});
