import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { planExercises, workoutLogs, workoutPlans } from "../../db/schema";
import { planCreateSchema, planUpdateSchema } from "../../shared/schemas";
import type { AppEnv } from "../env";
import {
  batchAll,
  chunkedInserts,
  dbFrom,
  definedFields,
  findInaccessibleExerciseIds,
} from "../lib/helpers";
import { parseJson } from "../lib/parse";
import { loadPlan, loadPlans } from "../lib/plans";

export const planRoutes = new Hono<AppEnv>();

type PlanExerciseInput = {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  order: number;
  restSeconds?: number;
  suggestedWeight?: number | null;
};

function planExerciseRows(planId: string, items: PlanExerciseInput[]) {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    planId,
    exerciseId: item.exerciseId,
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    order: item.order,
    restSeconds: item.restSeconds ?? 90,
    suggestedWeight: item.suggestedWeight ?? null,
  }));
}

planRoutes.get("/", async (c) => {
  return c.json({ plans: await loadPlans(dbFrom(c), c.get("userId")) });
});

planRoutes.get("/:id", async (c) => {
  const plan = await loadPlan(dbFrom(c), c.req.param("id"), c.get("userId"));
  if (!plan) return c.json({ error: "Plan nicht gefunden" }, 404);
  return c.json({ plan });
});

planRoutes.post("/", async (c) => {
  const parsed = parseJson(planCreateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const userId = c.get("userId");
  const exerciseIds = (parsed.data.exercises ?? []).map((item) => item.exerciseId);
  const bad = await findInaccessibleExerciseIds(db, userId, exerciseIds);
  if (bad.length) return c.json({ error: "Unbekannte oder fremde Übung im Plan" }, 400);

  const id = crypto.randomUUID();
  await batchAll(db, [
    db.insert(workoutPlans).values({
      id,
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdAt: Date.now(),
    }),
    ...chunkedInserts(db, planExercises, planExerciseRows(id, parsed.data.exercises ?? [])),
  ]);
  const plan = await loadPlan(db, id, userId);
  return c.json({ plan }, 201);
});

planRoutes.patch("/:id", async (c) => {
  const parsed = parseJson(planUpdateSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const id = c.req.param("id");
  const userId = c.get("userId");
  const existing = await loadPlan(db, id, userId);
  if (!existing) return c.json({ error: "Plan nicht gefunden" }, 404);

  if (parsed.data.exercises) {
    const bad = await findInaccessibleExerciseIds(
      db,
      userId,
      parsed.data.exercises.map((item) => item.exerciseId),
    );
    if (bad.length) return c.json({ error: "Unbekannte oder fremde Übung im Plan" }, 400);
  }

  const update = definedFields({
    title: parsed.data.title,
    description: parsed.data.description,
  });
  const ownPlan = and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId));

  await batchAll(db, [
    ...(Object.keys(update).length ? [db.update(workoutPlans).set(update).where(ownPlan)] : []),
    ...(parsed.data.exercises
      ? [
          db.delete(planExercises).where(eq(planExercises.planId, id)),
          ...chunkedInserts(db, planExercises, planExerciseRows(id, parsed.data.exercises)),
        ]
      : []),
  ]);

  return c.json({ plan: await loadPlan(db, id, userId) });
});

planRoutes.delete("/:id", async (c) => {
  const db = dbFrom(c);
  const id = c.req.param("id");
  const existing = await loadPlan(db, id, c.get("userId"));
  if (!existing) return c.json({ error: "Plan nicht gefunden" }, 404);
  await db.batch([
    // FK-Constraint: workout_logs.plan_id hat ON DELETE no action.
    // Referenzen auf null setzen, sonst schlägt das Löschen fehl.
    db.update(workoutLogs).set({ planId: null }).where(eq(workoutLogs.planId, id)),
    db.delete(planExercises).where(eq(planExercises.planId, id)),
    db.delete(workoutPlans).where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, c.get("userId")))),
  ]);
  return c.json({ ok: true });
});
