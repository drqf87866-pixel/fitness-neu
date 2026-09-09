import { Hono } from "hono";
import { and, eq, or } from "drizzle-orm";
import { exercises, planExercises, setLogs } from "../../db/schema";
import { exerciseCreateSchema, exerciseUpdateSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import { dbFrom, toExercise } from "../lib/helpers";
import { parseJson } from "../lib/parse";

export const exerciseRoutes = new Hono<AppEnv>();

exerciseRoutes.get("/", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(exercises)
    .where(or(eq(exercises.isCustom, false), eq(exercises.userId, userId)));
  return c.json({ exercises: rows.map(toExercise) });
});

exerciseRoutes.post("/", async (c) => {
  const parsed = parseJson(exerciseCreateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const id = crypto.randomUUID();
  await db.insert(exercises).values({
    id,
    name: parsed.data.name,
    category: parsed.data.category,
    primaryMuscle: parsed.data.primaryMuscle,
    secondaryMuscles: JSON.stringify(parsed.data.secondaryMuscles),
    equipment: parsed.data.equipment,
    isCustom: true,
    userId: c.get("userId"),
  });
  const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return c.json({ exercise: toExercise(row!) }, 201);
});

exerciseRoutes.patch("/:id", async (c) => {
  const parsed = parseJson(exerciseUpdateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const id = c.req.param("id");
  const [existing] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  if (!existing) return c.json({ error: "Übung nicht gefunden" }, 404);
  if (!existing.isCustom || existing.userId !== c.get("userId")) {
    return c.json({ error: "Nur eigene Übungen können geändert werden" }, 403);
  }

  await db
    .update(exercises)
    .set({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.primaryMuscle !== undefined ? { primaryMuscle: parsed.data.primaryMuscle } : {}),
      ...(parsed.data.secondaryMuscles !== undefined
        ? { secondaryMuscles: JSON.stringify(parsed.data.secondaryMuscles) }
        : {}),
      ...(parsed.data.equipment !== undefined ? { equipment: parsed.data.equipment } : {}),
    })
    .where(and(eq(exercises.id, id), eq(exercises.userId, c.get("userId"))));

  const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return c.json({ exercise: toExercise(row!) });
});

exerciseRoutes.delete("/:id", async (c) => {
  const db = dbFrom(c);
  const id = c.req.param("id");
  const [existing] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  if (!existing) return c.json({ error: "Übung nicht gefunden" }, 404);
  if (!existing.isCustom || existing.userId !== c.get("userId")) {
    return c.json({ error: "Nur eigene Übungen können gelöscht werden" }, 403);
  }
  // Referenz-Check: plan_exercises.exercise_id und set_logs.exercise_id haben
  // ON DELETE no action. Bei Verwendung 409 statt unbehandeltem FK-Fehler.
  const [planRef] = await db
    .select({ id: planExercises.id })
    .from(planExercises)
    .where(eq(planExercises.exerciseId, id))
    .limit(1);
  if (planRef) {
    return c.json({ error: "Übung wird noch in einem Plan verwendet" }, 409);
  }
  const [setRef] = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .where(eq(setLogs.exerciseId, id))
    .limit(1);
  if (setRef) {
    return c.json({ error: "Übung wurde bereits in Trainings verwendet" }, 409);
  }
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, c.get("userId"))));
  return c.json({ ok: true });
});
