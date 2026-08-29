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

// Readable-ish temporary password for bulk-created staff accounts — shown
// once to the admin doing the upload so they can distribute it manually
// (no email delivery guaranteed to be configured). Avoids visually
// ambiguous characters (0/O, 1/l/I) since these get read off a screen and
// typed by hand.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export function generateTempPassword(length = 10): string {
  return Array.from({ length }, () => TEMP_PASSWORD_CHARS[randomInt(0, TEMP_PASSWORD_CHARS.length)]).join("");
}
