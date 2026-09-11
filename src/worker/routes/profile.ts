import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { sessions, users } from "../../db/schema";
import { passwordChangeSchema, profileUpdateSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { dbFrom, definedFields, getUser, toProfile } from "../lib/helpers";
import { parseJson } from "../lib/parse";
import { hashPassword, verifyPassword } from "../lib/password";
import { consumeRateLimit } from "../lib/rate-limit";
import { createSessionToken, sessionCookie } from "../lib/session";
import { isSecure } from "./auth";

export const profileRoutes = new Hono<AppEnv>();

profileRoutes.get("/", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Nicht gefunden" }, 404);
  return c.json({ user: toProfile(user) });
});

profileRoutes.patch("/", async (c) => {
  const parsed = parseJson(profileUpdateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const update = definedFields(parsed.data);
  if (Object.keys(update).length) {
    await dbFrom(c).update(users).set(update).where(eq(users.id, c.get("userId")));
  }

  const user = await getUser(c);
  return c.json({ user: user ? toProfile(user) : null });
});

profileRoutes.post("/password", async (c) => {
  const parsed = parseJson(passwordChangeSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const userId = c.get("userId");
  // Ein gestohlenes Session-Cookie soll das aktuelle Passwort nicht durchprobieren können.
  const allowed = await consumeRateLimit(db, `pwchange:${userId}`, 5, 15 * 60);
  if (!allowed) return c.json({ error: "Zu viele Versuche. Bitte später erneut." }, 429);

  const user = await getUser(c);
  if (!user) return c.json({ error: "Nicht gefunden" }, 404);

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return c.json({ error: "Aktuelles Passwort ist falsch" }, 401);

  // Alle Sessions beenden – auch die eines Angreifers – und dieses Gerät
  // mit einem frischen Token angemeldet lassen.
  await db.batch([
    db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
      .where(eq(users.id, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
  ]);
  const token = await createSessionToken(db, userId);
  c.header("Set-Cookie", sessionCookie(token, isSecure(c)));

  return c.json({ ok: true });
});
