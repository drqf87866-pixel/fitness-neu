import { Hono } from "hono";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { exercises, planExercises, setLogs, workoutLogs, workoutPlans } from "../../db/schema";
import {
  patchSessionSchema,
  rangeQuerySchema,
  startSessionSchema,
  upsertSetsSchema,
} from "../../shared/schemas";
import type { PreviousSet, SessionSummary, SetLog, WorkoutSession } from "../../shared/types";
import type { AppEnv } from "../env";
import {
  batchAll,
  chunkedInserts,
  dbFrom,
  definedFields,
  findInaccessibleExerciseIds,
  isUniqueViolation,
} from "../lib/helpers";
import { parseJson } from "../lib/parse";

export const sessionRoutes = new Hono<AppEnv>();

/** Ohne Zeitraum liefert die Liste die jüngsten Trainings. */
const DEFAULT_LIST_LIMIT = 90;
/** Obergrenze auch mit Zeitraum – ein Monat hat realistisch deutlich weniger. */
const MAX_LIST_LIMIT = 500;

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

type SetRow = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
};

async function replaceSetsBatch(
  db: ReturnType<typeof dbFrom>,
  workoutLogId: string,
  rows: SetRow[],
) {
  await batchAll(db, [
    db.delete(setLogs).where(eq(setLogs.workoutLogId, workoutLogId)),
    ...chunkedInserts(db, setLogs, rows),
  ]);
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

async function findOpenSession(db: ReturnType<typeof dbFrom>, userId: string) {
  const [open] = await db
    .select({ id: workoutLogs.id })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), isNull(workoutLogs.completedAt)))
    .orderBy(desc(workoutLogs.startedAt))
    .limit(1);
  return open ?? null;
}

sessionRoutes.get("/", async (c) => {
  const range = rangeQuerySchema.safeParse(c.req.query());
  if (!range.success) return c.json({ error: range.error.issues[0]?.message ?? "Ungültiger Zeitraum" }, 400);
  const { from, to } = range.data;
  const hasRange = from !== undefined || to !== undefined;

  const db = dbFrom(c);
  const userId = c.get("userId");
  const conditions = [
    eq(workoutLogs.userId, userId),
    ...(from !== undefined ? [gte(workoutLogs.startedAt, from)] : []),
    ...(to !== undefined ? [lt(workoutLogs.startedAt, to)] : []),
  ];

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
    .where(and(...conditions))
    .orderBy(desc(workoutLogs.startedAt))
    .limit(hasRange ? MAX_LIST_LIMIT : DEFAULT_LIST_LIMIT);

  // Kennzahlen gruppiert und nur für die geladenen Trainings: ohne Zeitraum
  // ab dem ältesten geladenen, sonst mit denselben Grenzen wie die Liste.
  const oldest = logs[logs.length - 1]?.startedAt;
  const stats = logs.length
    ? await db
        .select({
          workoutLogId: setLogs.workoutLogId,
          setCount: sql<number>`count(*)`,
          volume: sql<number>`coalesce(sum(${setLogs.weight} * ${setLogs.reps}), 0)`,
        })
        .from(setLogs)
        .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
        .where(
          and(
            ...conditions,
            ...(oldest !== undefined ? [gte(workoutLogs.startedAt, oldest)] : []),
            eq(setLogs.isCompleted, true),
          ),
        )
        .groupBy(setLogs.workoutLogId)
    : [];

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
  const open = await findOpenSession(db, userId);
  if (!open) return c.json({ session: null });
  return c.json({ session: await loadSession(db, open.id, userId) });
});

/**
 * Letzte Werte je Übung: für jede Übung der Session die Sätze aus dem jüngsten
 * abgeschlossenen Training, in dem genau diese Übung vorkam – nicht nur aus
 * dem jüngsten Training, das irgendeine der Übungen enthielt.
 */
sessionRoutes.get("/:id/previous", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const session = await loadSession(db, c.req.param("id"), userId);
  if (!session) return c.json({ error: "Session nicht gefunden" }, 404);

  const exerciseIds = session.exercises.map((ex) => ex.exerciseId);
  if (!exerciseIds.length) return c.json({ previous: [] satisfies PreviousSet[] });

  const completedWithSet = and(
    eq(workoutLogs.userId, userId),
    isNotNull(workoutLogs.completedAt),
    ne(workoutLogs.id, session.id),
    eq(setLogs.isCompleted, true),
    inArray(setLogs.exerciseId, exerciseIds),
  );

  // SQLite liefert bei MAX() die übrigen Spalten aus der Zeile mit dem Maximum.
  const latest = await db
    .select({
      exerciseId: setLogs.exerciseId,
      workoutLogId: workoutLogs.id,
      completedAt: sql<number>`max(${workoutLogs.completedAt})`,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(completedWithSet)
    .groupBy(setLogs.exerciseId);
  if (!latest.length) return c.json({ previous: [] satisfies PreviousSet[] });

  const wanted = new Set(latest.map((row) => `${row.workoutLogId}:${row.exerciseId}`));
  const sets = await db
    .select({
      workoutLogId: setLogs.workoutLogId,
      exerciseId: setLogs.exerciseId,
      setNumber: setLogs.setNumber,
      weight: setLogs.weight,
      reps: setLogs.reps,
    })
    .from(setLogs)
    .where(
      and(
        inArray(setLogs.workoutLogId, [...new Set(latest.map((row) => row.workoutLogId))]),
        inArray(setLogs.exerciseId, exerciseIds),
        eq(setLogs.isCompleted, true),
      ),
    );

  const previous: PreviousSet[] = sets
    .filter((set) => wanted.has(`${set.workoutLogId}:${set.exerciseId}`))
    .map((set) => ({
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
    }));

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
  const planId = parsed.data.planId ?? null;

  if (planId) {
    const [plan] = await db
      .select({ id: workoutPlans.id })
      .from(workoutPlans)
      .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)))
      .limit(1);
    if (!plan) return c.json({ error: "Plan nicht gefunden" }, 400);
  }

  const [existing] = await db
    .select({ id: workoutLogs.id })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (existing) {
    return c.json({ session: await loadSession(db, existing.id, userId), resumed: false });
  }

  /** Läuft bereits ein Training, wird es fortgesetzt statt ein zweites zu öffnen. */
  const resumeOpen = async (openId: string) => {
    const session = await loadSession(db, openId, userId);
    if (session && session.sets.length === 0 && session.planId) {
      const planned = await db.select().from(planExercises).where(eq(planExercises.planId, session.planId));
      if (planned.length) {
        await batchAll(db, chunkedInserts(db, setLogs, rowsFromPlan(openId, planned)));
        return c.json({ session: await loadSession(db, openId, userId), resumed: true });
      }
    }
    return c.json({ session, resumed: true });
  };

  const open = await findOpenSession(db, userId);
  if (open) return resumeOpen(open.id);

  const planned = planId
    ? await db.select().from(planExercises).where(eq(planExercises.planId, planId))
    : [];
  try {
    await batchAll(db, [
      db.insert(workoutLogs).values({ id, userId, planId, startedAt: Date.now() }),
      ...chunkedInserts(db, setLogs, rowsFromPlan(id, planned)),
    ]);
  } catch (error) {
    // Paralleler Start (z. B. Doppeltipp): der Unique-Index auf offene
    // Trainings lehnt das zweite ab – dann das bereits angelegte zurückgeben.
    if (!isUniqueViolation(error)) throw error;
    const winner = await findOpenSession(db, userId);
    if (!winner) throw error;
    return resumeOpen(winner.id);
  }

  return c.json({ session: await loadSession(db, id, userId), resumed: false }, 201);
});

sessionRoutes.patch("/:id", async (c) => {
  const parsed = parseJson(patchSessionSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const db = dbFrom(c);
  const id = c.req.param("id");
  const userId = c.get("userId");
  const [log] = await db
    .select({ startedAt: workoutLogs.startedAt, completedAt: workoutLogs.completedAt })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (!log) return c.json({ error: "Session nicht gefunden" }, 404);

  const update = definedFields({
    // Ein bereits abgeschlossenes Training behält seinen Zeitpunkt – ein
    // wiederholter Abschluss aus dem Offline-Sync ändert daran nichts.
    completedAt:
      parsed.data.completedAt !== undefined && log.completedAt === null
        ? Math.max(parsed.data.completedAt, log.startedAt)
        : undefined,
    notes: parsed.data.notes,
  });
  if (Object.keys(update).length) {
    await db
      .update(workoutLogs)
      .set(update)
      .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  }

  return c.json({ session: await loadSession(db, id, userId) });
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

  await db.batch([
    db.delete(setLogs).where(eq(setLogs.workoutLogId, id)),
    db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId))),
  ]);

  return c.body(null, 204);
});

sessionRoutes.put("/:id/sets", async (c) => {
  const parsed = parseJson(upsertSetsSchema, await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const db = dbFrom(c);
  const id = c.req.param("id");
  const userId = c.get("userId");
  const [log] = await db
    .select({ completedAt: workoutLogs.completedAt })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);
  if (!log) return c.json({ error: "Session nicht gefunden" }, 404);
  if (log.completedAt) return c.json({ error: "Session ist bereits abgeschlossen" }, 409);

  const bad = await findInaccessibleExerciseIds(
    db,
    userId,
    parsed.data.sets.map((set) => set.exerciseId),
  );
  if (bad.length) return c.json({ error: "Unbekannte oder fremde Übung in den Sätzen" }, 400);

  await replaceSetsBatch(
    db,
    id,
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

  return c.json({ session: await loadSession(db, id, userId) });
});
