import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

const COOKIE_NAME = "admin_session";

export type AdminSession = {
  id: string;
  email: string;
  role: "admin" | "faculty";
};

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — see .env.example");
  return s;
}

export function signAdminSession(session: AdminSession): string {
  return jwt.sign(session, secret(), { expiresIn: "12h" });
}

export function verifyAdminSessionToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, secret()) as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const claims = verifyAdminSessionToken(token);
  if (!claims) return null;

  // The JWT alone is valid for up to 12h regardless of DB state — checking
  // is_active/role here on every request (not just at login) means
  // deactivating an account or changing its role takes effect immediately,
  // not "whenever their token happens to expire."
  const rows = await sql`select role, is_active from admins where id = ${claims.id}`;
  const current = rows[0];
  if (!current || !current.is_active) return null;

  return { id: claims.id, email: claims.email, role: current.role };
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
