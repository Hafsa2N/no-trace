// Seed the first admin/faculty account — and double as the break-glass
// account-recovery path: run again with an EXISTING email and it resets
// that account's password instead of failing (upsert on email). This is
// the "every admin is locked out and email delivery isn't configured yet"
// last resort — requires DATABASE_URL / shell access, unlike the in-app
// /admin/forgot-password flow, which needs real email to work.
// Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [admin|faculty]
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const [, , email, password, role = "admin"] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [admin|faculty]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const passwordHash = await bcrypt.hash(password, 10);

await sql`
  insert into admins (email, password_hash, role)
  values (${email}, ${passwordHash}, ${role})
  on conflict (email) do update set password_hash = excluded.password_hash, role = excluded.role
`;

console.log(`Created/updated ${role} account for ${email}`);
