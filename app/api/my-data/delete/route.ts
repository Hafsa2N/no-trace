import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyMyDataToken } from "@/lib/myDataAuth";
import { withErrors } from "@/lib/api";

export const POST = withErrors(async (req: NextRequest) => {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const rollNumber = token ? verifyMyDataToken(token) : null;
  if (!rollNumber) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Safe to delete outright: session_participants stores only a salted
  // hash with no foreign key to students, so removing this roster row
  // can't cascade into or break anything on the anonymous side.
  await sql`delete from students where roll_number = ${rollNumber}`;

  return NextResponse.json({ ok: true });
});
