import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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
  return verifyAdminSessionToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
