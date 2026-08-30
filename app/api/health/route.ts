import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Deliberately unauthenticated — an uptime monitor needs to reach this
// without credentials. It only proves the app is running and can reach its
// database; it says nothing about auth, rate limiting, or any other
// subsystem, and isn't a substitute for testing an actual feature.
export async function GET() {
  try {
    await sql`select 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
