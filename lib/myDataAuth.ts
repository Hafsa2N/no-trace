import jwt from "jsonwebtoken";

// Short-lived, purpose-scoped token proving "this request is from the
// student who just verified roll_number X" — held only in the browser's
// memory for the few minutes it takes to view/delete their own record,
// never persisted as a cookie or account session.
const PURPOSE = "my-data-access";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — see .env.example");
  return s;
}

export function signMyDataToken(rollNumber: string): string {
  return jwt.sign({ rollNumber, purpose: PURPOSE }, secret(), { expiresIn: "10m" });
}

export function verifyMyDataToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret()) as { rollNumber: string; purpose: string };
    if (payload.purpose !== PURPOSE) return null;
    return payload.rollNumber;
  } catch {
    return null;
  }
}
