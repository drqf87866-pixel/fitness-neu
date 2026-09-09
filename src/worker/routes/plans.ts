import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { planExercises, workoutPlans } from "../../db/schema";
import { planCreateSchema, planUpdateSchema } from "../../shared/schemas";
import type { WorkoutPlan } from "../../shared/types";
import type { AppEnv } from "../env";
import { dbFrom, batchAll, findInaccessibleExerciseIds } from "../lib/helpers";
import { parseJson } from "../lib/parse";
import { loadPlan } from "../lib/plans";

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
  const db = dbFrom(c);
  const userId = c.get("userId");
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.userId, userId))
    .orderBy(desc(workoutPlans.createdAt));
  const full = await Promise.all(plans.map((plan) => loadPlan(db, plan.id, userId)));
  return c.json({ plans: full.filter((plan): plan is WorkoutPlan => Boolean(plan)) });
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
  const rows = planExerciseRows(id, parsed.data.exercises ?? []);
  const stmts: Parameters<typeof batchAll>[1] = [
    db.insert(workoutPlans).values({
      id,
      userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdAt: Date.now(),
    }),
  ];
  for (let i = 0; i < rows.length; i += 10) {
    stmts.push(db.insert(planExercises).values(rows.slice(i, i + 10)));
  }
  await batchAll(db, stmts);
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

  const update = {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
  };

  if (parsed.data.exercises) {
    const rows = planExerciseRows(id, parsed.data.exercises);
    const stmts: Parameters<typeof batchAll>[1] = [
      db
        .update(workoutPlans)
        .set(update)
        .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId))),
      db.delete(planExercises).where(eq(planExercises.planId, id)),
    ];
    for (let i = 0; i < rows.length; i += 10) {
      stmts.push(db.insert(planExercises).values(rows.slice(i, i + 10)));
    }
    await batchAll(db, stmts);
  } else if (Object.keys(update).length) {
    await db
      .update(workoutPlans)
      .set(update)
      .where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, userId)));
  }

  return c.json({ plan: await loadPlan(db, id, userId) });
});

planRoutes.delete("/:id", async (c) => {
  const db = dbFrom(c);
  const id = c.req.param("id");
  const existing = await loadPlan(db, id, c.get("userId"));
  if (!existing) return c.json({ error: "Plan nicht gefunden" }, 404);
  await db.batch([
    db.delete(planExercises).where(eq(planExercises.planId, id)),
    db.delete(workoutPlans).where(and(eq(workoutPlans.id, id), eq(workoutPlans.userId, c.get("userId")))),
  ]);
  return c.json({ ok: true });
});
