import { createDb, type Database } from "../../db/client";
import { exercises, users } from "../../db/schema";
import type { Exercise, UserProfile } from "../../shared/types";
import type { AppEnv } from "../env";
import type { Context } from "hono";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

export function dbFrom(c: Context<AppEnv>) {
  return createDb(c.env.DB);
}

export function toProfile(row: typeof users.$inferSelect): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    targetGoal: row.targetGoal,
    weightKg: row.weightKg,
    experienceLevel: (row.experienceLevel as UserProfile["experienceLevel"]) ?? null,
    calorieTarget: row.calorieTarget,
    unit: row.unit === "lbs" ? "lbs" : "kg",
    createdAt: row.createdAt,
  };
}

export function parseMuscles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toExercise(row: typeof exercises.$inferSelect): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    primaryMuscle: row.primaryMuscle,
    secondaryMuscles: parseMuscles(row.secondaryMuscles),
    equipment: row.equipment,
    isCustom: Boolean(row.isCustom),
    userId: row.userId,
  };
}

export async function getUser(c: Context<AppEnv>) {
  const db = dbFrom(c);
  const userId = c.get("userId");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function estimated1rm(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Führt heterogene D1-Statements (Insert/Update/Delete verschiedener Tabellen)
 * in einem atomaren Batch aus. Drizzle verlangt ein nicht-leeres Tupel aus
 * einem gemeinsamen BatchItem-Typ – deshalb der explizite Sammeltyp.
 */
export async function batchAll(db: Database, stmts: BatchItem<"sqlite">[]): Promise<void> {
  if (!stmts.length) return;
  await db.batch(stmts as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/**
 * Liefert IDs zurück, die weder globale Katalog-Übungen noch eigene
 * Custom-Übungen des Users sind (unbekannt oder fremd).
 */
export async function findInaccessibleExerciseIds(
  db: Database,
  userId: string,
  ids: string[],
): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const rows = await db
    .select({ id: exercises.id, userId: exercises.userId, isCustom: exercises.isCustom })
    .from(exercises)
    .where(inArray(exercises.id, unique));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const bad: string[] = [];
  for (const id of unique) {
    const row = byId.get(id);
    if (!row) {
      bad.push(id);
      continue;
    }
    if (!row.isCustom) continue;
    if (row.userId !== userId) bad.push(id);
  }
  return bad;
}
