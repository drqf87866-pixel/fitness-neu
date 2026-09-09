import { Hono } from "hono";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { exercises, planExercises, setLogs, workoutLogs, workoutPlans } from "../../db/schema";
import { patchSessionSchema, startSessionSchema, upsertSetsSchema } from "../../shared/schemas";
import type { PreviousSet, SessionSummary, SetLog, WorkoutSession } from "../../shared/types";
import type { AppEnv } from "../env";
import { dbFrom } from "../lib/helpers";
import { parseJson } from "../lib/parse";

export const sessionRoutes = new Hono<AppEnv>();

async function loadSession(
  db: ReturnType<typeof dbFrom>,
  sessionId: string,
  userId: string,
): Promise<WorkoutSession | null> {
  const [log] = await db
    .select({
      id: workoutLogs.id,
      userId: workoutLogs.userId,
      planId: workoutLogs.planId,
      planTitle: workoutPlans.title,
      startedAt: workoutLogs.startedAt,
      completedAt: workoutLogs.completedAt,
      notes: workoutLogs.notes,
    })
    .from(workoutLogs)
    .leftJoin(workoutPlans, eq(workoutLogs.planId, workoutPlans.id))
    .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (!log) return null;

  const sets = await db.select().from(setLogs).where(eq(setLogs.workoutLogId, sessionId));
  const exerciseIds = [...new Set(sets.map((set) => set.exerciseId))];
  const catalog = exerciseIds.length
    ? await db.select().from(exercises).where(inArray(exercises.id, exerciseIds))
    : [];
  const plannedByExercise = new Map<
    string,
    { order: number; restSeconds: number; targetReps: string; suggestedWeight: number | null }
  >();
  if (log.planId) {
    const planned = await db.select().from(planExercises).where(eq(planExercises.planId, log.planId));
    for (const item of planned) {
      plannedByExercise.set(item.exerciseId, {
        order: item.order,
        restSeconds: item.restSeconds,
        targetReps: item.targetReps,
        suggestedWeight: item.suggestedWeight,
      });
    }
  }

  // Reihenfolge des ersten Satzes je Übung – Grundlage für spontan im Training
  // ergänzte Übungen, die im Plan nicht vorkommen.
  const firstSetIndex = new Map<string, number>();
  sets.forEach((set, index) => {
    if (!firstSetIndex.has(set.exerciseId)) firstSetIndex.set(set.exerciseId, index);
  });

  // Ohne explizite Sortierung liefert die Katalogabfrage eine beliebige
  // Reihenfolge – die Übungen erschienen im Training dann nicht in Planreihenfolge.
  const rank = (exerciseId: string) => {
    const planned = plannedByExercise.get(exerciseId);
    return planned ? planned.order : 1_000 + (firstSetIndex.get(exerciseId) ?? 0);
  };

  const exerciseMeta = catalog
    .map((ex) => {
      const planned = plannedByExercise.get(ex.id);
      return {
        exerciseId: ex.id,
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        restSeconds: planned?.restSeconds ?? 90,
        targetReps: planned?.targetReps ?? null,
        suggestedWeight: planned?.suggestedWeight ?? null,
      };
    })
    .sort((a, b) => rank(a.exerciseId) - rank(b.exerciseId));

  return {
    id: log.id,
    userId: log.userId,
    planId: log.planId,
    planTitle: log.planTitle ?? null,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    notes: log.notes,
    sets: sets.map(
      (set): SetLog => ({
        id: set.id,
        workoutLogId: set.workoutLogId,
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        isCompleted: Boolean(set.isCompleted),
      }),
    ),
    exercises: exerciseMeta,
  };
}

async function insertSetsChunked(
  db: ReturnType<typeof dbFrom>,
  rows: Array<{
    id: string;
    workoutLogId: string;
    exerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
    isCompleted: boolean;
  }>,
) {
  const size = 10;
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(setLogs).values(rows.slice(i, i + size));
  }
}

function rowsFromPlan(
  workoutLogId: string,
  planned: Array<{
    exerciseId: string;
    targetSets: number;
    targetReps: string;
    suggestedWeight: number | null;
  }>,
) {
  return planned.flatMap((item) =>
    Array.from({ length: item.targetSets }, (_, index) => ({
      id: crypto.randomUUID(),
      workoutLogId,
      exerciseId: item.exerciseId,
      setNumber: index + 1,
      weight: item.suggestedWeight ?? 0,
      reps: Number.parseInt(item.targetReps, 10) || 8,
      isCompleted: false,
    })),
  );
}

sessionRoutes.get("/", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const logs = await db
    .select({
      id: workoutLogs.id,
      userId: workoutLogs.userId,
      planId: workoutLogs.planId,
      planTitle: workoutPlans.title,
      startedAt: workoutLogs.startedAt,
      completedAt: workoutLogs.completedAt,
      notes: workoutLogs.notes,
    })
    .from(workoutLogs)
    .leftJoin(workoutPlans, eq(workoutLogs.planId, workoutPlans.id))
    .where(eq(workoutLogs.userId, userId))
    .orderBy(desc(workoutLogs.startedAt))
    .limit(90);

  // Kennzahlen in einer gruppierten Abfrage statt pro Session einzeln.
  const stats = await db
    .select({
      workoutLogId: setLogs.workoutLogId,
      setCount: sql<number>`count(*)`,
      volume: sql<number>`coalesce(sum(${setLogs.weight} * ${setLogs.reps}), 0)`,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(and(eq(workoutLogs.userId, userId), eq(setLogs.isCompleted, true)))
    .groupBy(setLogs.workoutLogId);

  const statsById = new Map(stats.map((row) => [row.workoutLogId, row]));

  return c.json({
    sessions: logs.map((log): SessionSummary => {
      const summary = statsById.get(log.id);
      return {
        id: log.id,
        planId: log.planId,
        planTitle: log.planTitle ?? null,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        notes: log.notes,
        setCount: Number(summary?.setCount ?? 0),
        volumeKg: Math.round(Number(summary?.volume ?? 0)),
      };
    }),
  });
});

sessionRoutes.get("/open", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const [open] = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), isNull(workoutLogs.completedAt)))
    .orderBy(desc(workoutLogs.startedAt))
    .limit(1);
  if (!open) return c.json({ session: null });
  return c.json({ session: await loadSession(db, open.id, userId) });
});

sessionRoutes.get("/:id/previous", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const session = await loadSession(db, c.req.param("id"), userId);
  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);

  const exerciseIds = session.exercises.map((ex) => ex.exerciseId);
  if (!exerciseIds.length) return c.json({ previous: [] satisfies PreviousSet[] });

  const completed = await db
    .select({ id: workoutLogs.id, completedAt: workoutLogs.completedAt })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), isNotNull(workoutLogs.completedAt)))
    .orderBy(desc(workoutLogs.completedAt))
    .limit(20);

  const previous: PreviousSet[] = [];
  for (const log of completed) {
    if (log.id === session.id) continue;
    const sets = await db
      .select()
      .from(setLogs)
      .where(and(eq(setLogs.workoutLogId, log.id), eq(setLogs.isCompleted, true)));
    const relevant = sets.filter((set) => exerciseIds.includes(set.exerciseId));
    if (!relevant.length) continue;
    for (const set of relevant) {
      previous.push({
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
      });
    }
    break;
  }

  return c.json({ previous });
});

sessionRoutes.get("/:id", async (c) => {
  const session = await loadSession(dbFrom(c), c.req.param("id"), c.get("userId"));
  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);
  return c.json({ session });
});

sessionRoutes.post("/", async (c) => {
  const parsed = parseJson(startSessionSchema, await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);

  const db = dbFrom(c);
  const userId = c.get("userId");
  const id = parsed.data.id ?? crypto.randomUUID();

  const [existing] = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (existing) {
    return c.json({ session: await loadSession(db, existing.id, userId) });
  }

  const [open] = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), isNull(workoutLogs.completedAt)))
    .limit(1);
  if (open) {
    const session = await loadSession(db, open.id, userId);
    if (session && session.sets.length === 0 && session.planId) {
      const planned = await db.select().from(planExercises).where(eq(planExercises.planId, session.planId));
      if (planned.length) {
        await insertSetsChunked(db, rowsFromPlan(open.id, planned));
        return c.json({ session: await loadSession(db, open.id, userId) });
      }
    }
    return c.json({ session });
  }

  await db.insert(workoutLogs).values({
    id,
    userId,
    planId: parsed.data.planId ?? null,
    startedAt: Date.now(),
  });

  if (parsed.data.planId) {
    const planned = await db
      .select()
      .from(planExercises)
      .where(eq(planExercises.planId, parsed.data.planId));
    if (planned.length) {
      await insertSetsChunked(db, rowsFromPlan(id, planned));
    }
  }

  return c.json({ session: await loadSession(db, id, userId) }, 201);
});

sessionRoutes.patch("/:id", async (c) => {
  const parsed = parseJson(patchSessionSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const db = dbFrom(c);
  const id = c.req.param("id");
  const session = await loadSession(db, id, c.get("userId"));
  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);

  await db
    .update(workoutLogs)
    .set({
      ...(parsed.data.completedAt !== undefined ? { completedAt: parsed.data.completedAt } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    })
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, c.get("userId"))));

  return c.json({ session: await loadSession(db, id, c.get("userId")) });
});

sessionRoutes.delete("/:id", async (c) => {
  const db = dbFrom(c);
  const id = c.req.param("id");
  const userId = c.get("userId");
  const [session] = await db
    .select({ id: workoutLogs.id, completedAt: workoutLogs.completedAt })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);

  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);
  if (!session.completedAt) return c.json({ error: "Offene Sessions können nicht gelöscht werden" }, 409);

  await db.delete(setLogs).where(eq(setLogs.workoutLogId, id));
  await db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));

  return c.body(null, 204);
});

sessionRoutes.put("/:id/sets", async (c) => {
  const parsed = parseJson(upsertSetsSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const db = dbFrom(c);
  const id = c.req.param("id");
  const session = await loadSession(db, id, c.get("userId"));
  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);
  if (session.completedAt) return c.json({ error: "Session ist bereits abgeschlossen" }, 409);

  await db.delete(setLogs).where(eq(setLogs.workoutLogId, id));
  await insertSetsChunked(
    db,
    parsed.data.sets.map((set) => ({
      id: set.id ?? crypto.randomUUID(),
      workoutLogId: id,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      isCompleted: set.isCompleted,
    })),
  );

  return c.json({ session: await loadSession(db, id, c.get("userId")) });
});
