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

  return NextResponse.json(analytics);
});
