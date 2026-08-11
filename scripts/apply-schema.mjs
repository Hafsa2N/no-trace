// Run with: node --env-file=.env.local scripts/apply-schema.mjs
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set — check .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

// Strip full-line comments first, THEN split on ';' — splitting before
// stripping comments would misfire whenever a statement is preceded by a
// comment line with no semicolon between them.
const withoutComments = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const statements = withoutComments
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Schema applied (${statements.length} statements).`);
