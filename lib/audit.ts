import { sql } from "@/lib/db";

/**
 * Records who did what administrative action. Deliberately scoped to
 * staff-side actions only (sessions, updates, roster, moderation) — never
 * anything that would link a response back to a student.
 */
export async function logAction(actorId: string, action: string, targetId?: string, details?: Record<string, unknown>) {
  await sql`
    insert into audit_log (actor_id, action, target_id, details)
    values (${actorId}, ${action}, ${targetId ?? null}, ${details ? JSON.stringify(details) : null})
  `;
}
