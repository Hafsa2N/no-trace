import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyMyDataToken } from "@/lib/myDataAuth";
import { withErrors } from "@/lib/api";

function getRollNumber(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return token ? verifyMyDataToken(token) : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const rollNumber = getRollNumber(req);
  if (!rollNumber) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    select roll_number, name, department, year, section, email, consent_given_at, created_at
    from students where roll_number = ${rollNumber}
  `;
  const student = rows[0];
  if (!student) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  return NextResponse.json({ student });
});
