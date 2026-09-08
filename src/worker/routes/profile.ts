import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { passwordChangeSchema, profileUpdateSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { dbFrom, getUser, toProfile } from "../lib/helpers";
import { parseJson } from "../lib/parse";
import { hashPassword, verifyPassword } from "../lib/password";

export const profileRoutes = new Hono<AppEnv>();

profileRoutes.get("/", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Nicht gefunden" }, 404);
  return c.json({ user: toProfile(user) });
});

profileRoutes.patch("/", async (c) => {
  const parsed = parseJson(profileUpdateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const userId = c.get("userId");
  await db
    .update(users)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.targetGoal !== undefined ? { targetGoal: parsed.data.targetGoal } : {}),
      ...(parsed.data.weightKg !== undefined ? { weightKg: parsed.data.weightKg } : {}),
      ...(parsed.data.experienceLevel !== undefined ? { experienceLevel: parsed.data.experienceLevel } : {}),
      ...(parsed.data.calorieTarget !== undefined ? { calorieTarget: parsed.data.calorieTarget } : {}),
      ...(parsed.data.unit !== undefined ? { unit: parsed.data.unit } : {}),
    })
    .where(eq(users.id, userId));

  const user = await getUser(c);
  return c.json({ user: user ? toProfile(user) : null });
});

profileRoutes.post("/password", async (c) => {
  const parsed = parseJson(passwordChangeSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const user = await getUser(c);
  if (!user) return c.json({ error: "Nicht gefunden" }, 404);

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return c.json({ error: "Aktuelles Passwort ist falsch" }, 401);

  const db = dbFrom(c);
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(users.id, c.get("userId")));

  return c.json({ ok: true });
});
