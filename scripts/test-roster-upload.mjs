// Dev-only smoke test: exercises the real /api/roster/upload endpoint
// (not a DB shortcut) against the local dev server.
import { readFileSync } from "fs";

const base = "http://localhost:3001";

const loginRes = await fetch(`${base}/api/auth/admin-login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@college.edu", password: "password123" }),
});
if (!loginRes.ok) {
  console.error("Login failed:", await loginRes.text());
  process.exit(1);
}
const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
if (!cookie) {
  console.error("No session cookie returned");
  process.exit(1);
}

const fileBuffer = readFileSync("sample-roster.xlsx");
const form = new FormData();
form.append("file", new Blob([fileBuffer]), "sample-roster.xlsx");

const uploadRes = await fetch(`${base}/api/roster/upload`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: form,
});

console.log(uploadRes.status, await uploadRes.json());
