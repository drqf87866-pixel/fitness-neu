import { and, asc, desc, eq } from "drizzle-orm";
import { exercises, planExercises, workoutPlans } from "../../db/schema";
import type { PlanExercise, WorkoutPlan } from "../../shared/types";
import type { Database } from "../../db/client";

const planExerciseColumns = {
  id: planExercises.id,
  planId: planExercises.planId,
  exerciseId: planExercises.exerciseId,
  exerciseName: exercises.name,
  primaryMuscle: exercises.primaryMuscle,
  targetSets: planExercises.targetSets,
  targetReps: planExercises.targetReps,
  order: planExercises.order,
  restSeconds: planExercises.restSeconds,
  suggestedWeight: planExercises.suggestedWeight,
};

function toPlan(plan: typeof workoutPlans.$inferSelect, rows: PlanExercise[]): WorkoutPlan {
  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    description: plan.description,
    createdAt: plan.createdAt,
    exercises: rows,
  };
}

export async function loadPlan(db: Database, planId: string, userId: string): Promise<WorkoutPlan | null> {
  const [plan] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)))
    .limit(1);
  if (!plan) return null;

  const rows = await db
    .select(planExerciseColumns)
    .from(planExercises)
    .innerJoin(exercises, eq(planExercises.exerciseId, exercises.id))
    .where(eq(planExercises.planId, planId))
    .orderBy(asc(planExercises.order));

  return toPlan(plan, rows);
}

/** Alle Pläne eines Nutzers mit Übungen in zwei Abfragen statt zwei pro Plan. */
export async function loadPlans(db: Database, userId: string): Promise<WorkoutPlan[]> {
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.userId, userId))
    .orderBy(desc(workoutPlans.createdAt));
  if (!plans.length) return [];

  const rows = await db
    .select(planExerciseColumns)
    .from(planExercises)
    .innerJoin(exercises, eq(planExercises.exerciseId, exercises.id))
    .innerJoin(workoutPlans, eq(planExercises.planId, workoutPlans.id))
    .where(eq(workoutPlans.userId, userId))
    .orderBy(asc(planExercises.order));

  const byPlan = new Map<string, PlanExercise[]>();
  for (const row of rows) {
    const list = byPlan.get(row.planId);
    if (list) list.push(row);
    else byPlan.set(row.planId, [row]);
  }
  return plans.map((plan) => toPlan(plan, byPlan.get(plan.id) ?? []));
}
