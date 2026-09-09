import { Hono } from "hono";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { exercises, setLogs, workoutLogs } from "../../db/schema";
import type { MuscleVolume, PersonalRecord, VolumePoint } from "../../shared/types";
import type { AppEnv } from "../env";
import { dbFrom, estimated1rm, toProfile } from "../lib/helpers";
import { users } from "../../db/schema";

export const analyticsRoutes = new Hono<AppEnv>();

function isoWeek(ts: number): string {
  const date = new Date(ts);
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

analyticsRoutes.get("/prs", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const rows = await db
    .select({
      exerciseId: setLogs.exerciseId,
      exerciseName: exercises.name,
      weight: setLogs.weight,
      reps: setLogs.reps,
      startedAt: workoutLogs.startedAt,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(and(eq(workoutLogs.userId, userId), eq(setLogs.isCompleted, true)));

  const best = new Map<string, PersonalRecord>();
  for (const row of rows) {
    if (row.weight <= 0 || row.reps <= 0) continue;
    const e1rm = estimated1rm(row.weight, row.reps);
    const current = best.get(row.exerciseId);
    if (!current || e1rm > current.estimated1rm || (e1rm === current.estimated1rm && row.weight > current.maxWeight)) {
      best.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        maxWeight: row.weight,
        maxWeightReps: row.reps,
        estimated1rm: Math.round(e1rm * 10) / 10,
        achievedAt: row.startedAt,
      });
    }
  }

  return c.json({ prs: [...best.values()].sort((a, b) => b.estimated1rm - a.estimated1rm) });
});

analyticsRoutes.get("/volume", async (c) => {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const from = Number(c.req.query("from") ?? Date.now() - 1000 * 60 * 60 * 24 * 56);
  const to = Number(c.req.query("to") ?? Date.now());

  const rows = await db
    .select({
      primaryMuscle: exercises.primaryMuscle,
      weight: setLogs.weight,
      reps: setLogs.reps,
      startedAt: workoutLogs.startedAt,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(setLogs.isCompleted, true),
        gte(workoutLogs.startedAt, from),
        lte(workoutLogs.startedAt, to),
      ),
    );

  const points = new Map<string, VolumePoint>();
  for (const row of rows) {
    const week = isoWeek(row.startedAt);
    const key = `${week}:${row.primaryMuscle}`;
    const volume = row.weight * row.reps;
    const existing = points.get(key);
    if (existing) existing.volume += volume;
    else points.set(key, { week, primaryMuscle: row.primaryMuscle, volume });
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

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const volumeRes = await db
    .select({
      workoutLogId: workoutLogs.id,
      weight: setLogs.weight,
      reps: setLogs.reps,
      startedAt: workoutLogs.startedAt,
      completedAt: workoutLogs.completedAt,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(
      and(
        eq(workoutLogs.userId, userId),
        isNotNull(workoutLogs.completedAt),
        eq(setLogs.isCompleted, true),
        gte(workoutLogs.startedAt, weekAgo),
      ),
    );

  const weekVolume = volumeRes.reduce((sum, row) => sum + row.weight * row.reps, 0);
  const sessionCountThisWeek = new Set(volumeRes.map((row) => row.workoutLogId)).size;

  return c.json({
    profile: toProfile(user),
    weekVolume: Math.round(weekVolume),
    sessionCountThisWeek,
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
  const db = dbFrom(c);
  const userId = c.get("userId");
  const now = Date.now();
  const windowStart = now - 7 * 24 * 60 * 60 * 1000;
  const historyStart = now - 365 * 24 * 60 * 60 * 1000;

  const rows = await db
    .select({
      primaryMuscle: exercises.primaryMuscle,
      weight: setLogs.weight,
      reps: setLogs.reps,
      startedAt: workoutLogs.startedAt,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(setLogs.isCompleted, true),
        isNotNull(workoutLogs.completedAt),
        gte(workoutLogs.startedAt, historyStart),
      ),
    );

  const muscles = new Map<string, MuscleVolume>();
  for (const row of rows) {
    let entry = muscles.get(row.primaryMuscle);
    if (!entry) {
      entry = { primaryMuscle: row.primaryMuscle, volume: 0, setCount: 0, lastTrainedAt: null };
      muscles.set(row.primaryMuscle, entry);
    }
    if (entry.lastTrainedAt === null || row.startedAt > entry.lastTrainedAt) {
      entry.lastTrainedAt = row.startedAt;
    }
    if (row.startedAt >= windowStart) {
      entry.volume += row.weight * row.reps;
      entry.setCount += 1;
    }
  }

  return c.json({
    muscles: [...muscles.values()].map((entry) => ({
      ...entry,
      volume: Math.round(entry.volume),
    })),
  });
});
