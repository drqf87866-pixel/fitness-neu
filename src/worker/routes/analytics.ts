import { Hono } from "hono";
import { z } from "zod";
import { and, countDistinct, eq, gt, gte, isNotNull, lte, sql } from "drizzle-orm";
import { exercises, setLogs, users, workoutLogs } from "../../db/schema";
import { rangeQuerySchema } from "../../shared/schemas";
import type { MuscleVolume, PersonalRecord, VolumePoint } from "../../shared/types";
import type { AppEnv } from "../env";
import { dbFrom, toProfile } from "../lib/helpers";

export const analyticsRoutes = new Hono<AppEnv>();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ISO-Woche eines Kalendertags (Tage seit Epoch). Gleiche Formel wie im
 * Client (components/volume-chart.tsx), dort mit lokalem Datum.
 */
function isoWeekOfDay(day: number): string {
  const utc = new Date(day * DAY_MS);
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Abgeschlossene Sätze abgeschlossener Trainings des Nutzers. */
function completedSetsOf(userId: string) {
  return and(
    eq(workoutLogs.userId, userId),
    isNotNull(workoutLogs.completedAt),
    eq(setLogs.isCompleted, true),
  );
}

const volumeExpr = sql<number>`coalesce(sum(${setLogs.weight} * ${setLogs.reps}), 0)`;

analyticsRoutes.get("/prs", async (c) => {
  const db = dbFrom(c);
  // Geschätztes 1RM (Epley) direkt in SQL; SQLite liefert bei MAX() die
  // übrigen Spalten aus der Zeile mit dem Maximum.
  const e1rm = sql<number>`max(case when ${setLogs.reps} <= 1 then ${setLogs.weight} else ${setLogs.weight} * (1 + ${setLogs.reps} / 30.0) end)`;
  const rows = await db
    .select({
      exerciseId: setLogs.exerciseId,
      exerciseName: exercises.name,
      weight: setLogs.weight,
      reps: setLogs.reps,
      startedAt: workoutLogs.startedAt,
      e1rm,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(and(completedSetsOf(c.get("userId")), gt(setLogs.weight, 0), gt(setLogs.reps, 0)))
    .groupBy(setLogs.exerciseId);

  const prs = rows
    .map(
      (row): PersonalRecord => ({
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        maxWeight: row.weight,
        maxWeightReps: row.reps,
        estimated1rm: Math.round(Number(row.e1rm) * 10) / 10,
        achievedAt: row.startedAt,
      }),
    )
    .sort((a, b) => b.estimated1rm - a.estimated1rm);
  return c.json({ prs });
});

/** Zeitzonen-Offset des Clients in Minuten (`Date#getTimezoneOffset`). */
const volumeQuerySchema = z.object({
  tz: z.coerce.number().int().min(-840).max(840).optional(),
});

analyticsRoutes.get("/volume", async (c) => {
  const range = rangeQuerySchema.safeParse(c.req.query());
  const tzParsed = volumeQuerySchema.safeParse(c.req.query());
  if (!range.success) return c.json({ error: range.error.issues[0]?.message ?? "Ungültiger Zeitraum" }, 400);
  if (!tzParsed.success) return c.json({ error: "Ungültige Zeitzone" }, 400);

  const now = Date.now();
  const to = range.data.to ?? now;
  const from = range.data.from ?? to - 56 * DAY_MS;
  const offsetMs = (tzParsed.data.tz ?? 0) * 60_000;

  // Pro lokalem Kalendertag und Muskel vorsummieren – die Datenmenge hängt
  // dann an der Zahl der Trainingstage, nicht an der Zahl der Sätze.
  const day = sql<number>`cast((${workoutLogs.startedAt} - ${offsetMs}) / ${DAY_MS} as integer)`;
  const rows = await dbFrom(c)
    .select({ day, primaryMuscle: exercises.primaryMuscle, volume: volumeExpr })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(
      and(
        completedSetsOf(c.get("userId")),
        gte(workoutLogs.startedAt, from),
        lte(workoutLogs.startedAt, to),
      ),
    )
    .groupBy(day, exercises.primaryMuscle);

  const points = new Map<string, VolumePoint>();
  for (const row of rows) {
    const week = isoWeekOfDay(Number(row.day));
    const key = `${week}:${row.primaryMuscle}`;
    const existing = points.get(key);
    if (existing) existing.volume += Number(row.volume);
    else points.set(key, { week, primaryMuscle: row.primaryMuscle, volume: Number(row.volume) });
  }

  return c.json({
    volume: [...points.values()]
      .map((point) => ({ ...point, volume: Math.round(point.volume) }))
      .sort((a, b) => a.week.localeCompare(b.week)),
  });
});

analyticsRoutes.get("/dashboard", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: "Nicht gefunden" }, 404);

  const weekAgo = Date.now() - 7 * DAY_MS;
  const [week] = await db
    .select({ volume: volumeExpr, sessions: countDistinct(workoutLogs.id) })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(and(completedSetsOf(userId), gte(workoutLogs.startedAt, weekAgo)));

  return c.json({
    profile: toProfile(user),
    weekVolume: Math.round(Number(week?.volume ?? 0)),
    sessionCountThisWeek: Number(week?.sessions ?? 0),
  });
});

/**
 * Rollierendes 7-Tage-Volumen je Muskelgruppe für die Startseite.
 *
 * `/volume` bucketet nach ISO-Woche und kann ein tagesgenaues 7-Tage-Fenster
 * nicht abbilden. `lastTrainedAt` kommt aus einem 365-Tage-Fenster, damit auch
 * vernachlässigte Muskelgruppen sagen können, wie lange sie schon ruhen.
 */
analyticsRoutes.get("/muscles", async (c) => {
  const now = Date.now();
  const windowStart = now - 7 * DAY_MS;
  const historyStart = now - 365 * DAY_MS;
  const inWindow = sql`${workoutLogs.startedAt} >= ${windowStart}`;

  const rows = await dbFrom(c)
    .select({
      primaryMuscle: exercises.primaryMuscle,
      volume: sql<number>`coalesce(sum(case when ${inWindow} then ${setLogs.weight} * ${setLogs.reps} else 0 end), 0)`,
      setCount: sql<number>`sum(case when ${inWindow} then 1 else 0 end)`,
      lastTrainedAt: sql<number>`max(${workoutLogs.startedAt})`,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(and(completedSetsOf(c.get("userId")), gte(workoutLogs.startedAt, historyStart)))
    .groupBy(exercises.primaryMuscle);

  return c.json({
    muscles: rows.map(
      (row): MuscleVolume => ({
        primaryMuscle: row.primaryMuscle,
        volume: Math.round(Number(row.volume)),
        setCount: Number(row.setCount),
        lastTrainedAt: row.lastTrainedAt === null ? null : Number(row.lastTrainedAt),
      }),
    ),
  });
});
