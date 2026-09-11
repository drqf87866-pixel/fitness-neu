import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { loginSchema, registerSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { dbFrom, isUniqueViolation, toProfile } from "../lib/helpers";
import { parseJson } from "../lib/parse";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../lib/password";
import { clientIp, consumeRateLimit } from "../lib/rate-limit";
import {
  clearSessionCookie,
  createSessionToken,
  deleteSession,
  SESSION_COOKIE,
  sessionCookie,
} from "../lib/session";

export const authRoutes = new Hono<AppEnv>();

export function isSecure(c: { req: { url: string } }) {
  return new URL(c.req.url).protocol === "https:";
}

authRoutes.post("/register", async (c) => {
  const db = dbFrom(c);
  const allowed = await consumeRateLimit(db, `register:${clientIp(c.req.raw)}`, 8, 15 * 60);
  if (!allowed) return c.json({ error: "Zu viele Versuche. Bitte später erneut." }, 429);

  const parsed = parseJson(registerSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const email = parsed.data.email.toLowerCase();
  const alreadyRegistered = c.json({ error: "E-Mail ist bereits registriert" }, 409);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return alreadyRegistered;

  const id = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id,
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      createdAt: Date.now(),
    });
  } catch (error) {
    // Parallele Registrierung derselben Adresse: Unique-Index statt 500.
    if (isUniqueViolation(error)) return alreadyRegistered;
    throw error;
  }

  const token = await createSessionToken(db, id);
  c.header("Set-Cookie", sessionCookie(token, isSecure(c)));
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return c.json({ user: toProfile(user!) }, 201);
});

authRoutes.post("/login", async (c) => {
  const db = dbFrom(c);
  const allowed = await consumeRateLimit(db, `login:${clientIp(c.req.raw)}`, 10, 15 * 60);
  if (!allowed) return c.json({ error: "Zu viele Versuche. Bitte später erneut." }, 429);

  const parsed = parseJson(loginSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await burnPasswordCheck(parsed.data.password);
  if (!user || !valid) {
    return c.json({ error: "E-Mail oder Passwort ist falsch" }, 401);
  }

  const token = await createSessionToken(db, user.id);
  c.header("Set-Cookie", sessionCookie(token, isSecure(c)));
  return c.json({ user: toProfile(user) });
});

authRoutes.post("/logout", async (c) => {
  const db = dbFrom(c);
  await deleteSession(db, getCookie(c, SESSION_COOKIE));
  c.header("Set-Cookie", clearSessionCookie(isSecure(c)));
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const db = dbFrom(c);
  const [user] = await db.select().from(users).where(eq(users.id, c.get("userId"))).limit(1);
  if (!user) return c.json({ error: "Nicht angemeldet" }, 401);
  return c.json({ user: toProfile(user) });
});
