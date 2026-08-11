import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — see .env.example");
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

// Lazy proxy: only touches DATABASE_URL when a query actually runs, so
// build-time static analysis doesn't fail just because env vars aren't
// configured yet.
export const sql: NeonQueryFunction<false, false> = ((...args: Parameters<NeonQueryFunction<false, false>>) =>
  getClient()(...args)) as NeonQueryFunction<false, false>;
