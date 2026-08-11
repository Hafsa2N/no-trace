import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { logAction } from "@/lib/audit";

export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { hidden } = await req.json();
  if (typeof hidden !== "boolean") {
    return NextResponse.json({ error: "hidden must be a boolean" }, { status: 400 });
  }

  const rows = await sql`
    select r.id, so.assigned_faculty from responses r
    join session_offerings so on so.id = r.session_offering_id
    where r.id = ${id}
  `;
  const response = rows[0];
  if (!response) return NextResponse.json({ error: "Response not found" }, { status: 404 });

  if (session.role === "faculty" && response.assigned_faculty !== session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await sql`update responses set comment_hidden = ${hidden} where id = ${id}`;

  // Logs the moderation action itself, never the comment content — the
  // response id is just a pointer, same as everywhere else this codebase
  // keeps identity/content separate from administrative metadata.
  await logAction(session.id, hidden ? "comment.hidden" : "comment.unhidden", id);

  return NextResponse.json({ ok: true });
});
