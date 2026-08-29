import { sql } from "@/lib/db";

// Sliding-window rate limiter backed by Postgres rather than in-memory —
// serverless functions don't share process memory across invocations, so
// an in-memory counter would silently fail to catch abuse spread across
// cold starts or different instances.
//
// Counts existing hits in the window first: if already at the limit, the
// request is rejected without recording a new hit (the window empties out
// naturally as old hits age past `windowSeconds`, so no cleanup needed to
// unblock a caller — cleanup below is just to stop the table growing).
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const rows = await sql`
    select count(*) as count from rate_limit_hits where key = ${key} and created_at > ${windowStart}
  `;
  if (Number(rows[0].count) >= max) return false;

  await sql`insert into rate_limit_hits (key) values (${key})`;
  // Opportunistic cleanup, same pattern used for expired OTP codes
  // elsewhere — no background job infrastructure, so piggyback on traffic.
  await sql`delete from rate_limit_hits where created_at < now() - interval '1 day'`;
  return true;
}

// Best-effort — trusts the platform's proxy header (Vercel sets this
// correctly), not a security boundary on its own, just the key a rate
// limiter groups by.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";
