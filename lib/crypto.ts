import { createHmac, randomInt, randomBytes } from "crypto";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — see .env.example");
  return s;
}

/**
 * Salted per-session so the same student's hash differs across sessions —
 * this prevents correlating one student's participation across multiple
 * feedback sessions, not just within one.
 */
export function hashRollNumber(rollNumber: string, sessionId: string): string {
  return createHmac("sha256", secret())
    .update(`${sessionId}:${rollNumber.trim().toLowerCase()}`)
    .digest("hex");
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(code: string, sessionId: string, rollNumber: string): string {
  return createHmac("sha256", secret())
    .update(`${sessionId}:${rollNumber}:${code}`)
    .digest("hex");
}

/** Opaque, unlinked-to-identity token minted after OTP verification. */
export function generateAnonymousToken(): string {
  return randomBytes(32).toString("hex");
}

export function generatePasscode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
