import { sql } from "@/lib/db";

type ClaimResult =
  | { status: "claimed" }
  | { status: "duplicate"; responseBody: unknown }
  | { status: "in-progress" };

/**
 * Atomically claims an idempotency key for an admin-side mutation, the same
 * pattern used for student-side duplicate prevention (ON CONFLICT DO
 * NOTHING on a primary key) — just applied to a client-supplied key instead
 * of a roll-number hash. Call this before doing the mutating work; only
 * proceed if it returns "claimed".
 */
export async function claimIdempotencyKey(key: string, adminId: string): Promise<ClaimResult> {
  const inserted = await sql`
    insert into idempotency_keys (key, admin_id)
    values (${key}, ${adminId})
    on conflict (key) do nothing
    returning key
  `;
  if (inserted.length > 0) return { status: "claimed" };

  const existing = await sql`select response_body from idempotency_keys where key = ${key}`;
  const responseBody = existing[0]?.response_body;
  if (responseBody != null) return { status: "duplicate", responseBody };
  // The original request that claimed this key hasn't finished yet — this
  // is only reachable under genuine request overlap, not a normal retry.
  return { status: "in-progress" };
}

export async function storeIdempotencyResult(key: string, responseBody: unknown): Promise<void> {
  await sql`update idempotency_keys set response_body = ${JSON.stringify(responseBody)} where key = ${key}`;
}

/**
 * Releases a claimed key if the mutation it was guarding failed before a
 * result could be stored — otherwise that key would be stuck reporting
 * "in-progress" forever and the admin could never retry. Safe to call even
 * if the key was never claimed.
 */
export async function releaseIdempotencyKey(key: string): Promise<void> {
  await sql`delete from idempotency_keys where key = ${key} and response_body is null`;
}
