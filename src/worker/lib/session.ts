import { eq } from "drizzle-orm";
import { sessions } from "../../db/schema";
import type { Database } from "../../db/client";

const SESSION_TTL = 60 * 60 * 24 * 30;
export const SESSION_COOKIE = "ft_session";

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(
  db: Database,
  userId: string,
): Promise<string> {
  const token = bytesToB64Url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await sha256Hex(token);
  const expiresAt = Date.now() + SESSION_TTL * 1000;
  await db.insert(sessions).values({ tokenHash: hash, userId, expiresAt });
  return token;
}

export async function readSessionUserId(
  db: Database,
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const hash = await sha256Hex(token);
  const now = Date.now();
  const [row] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, hash))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt < now) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hash));
    return null;
  }
  return row.userId;
}

export async function deleteSession(
  db: Database,
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  const hash = await sha256Hex(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, hash));
}

export function sessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
