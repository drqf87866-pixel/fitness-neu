import { and, asc, eq } from "drizzle-orm";
import { exercises, planExercises, workoutPlans } from "../../db/schema";
import type { PlanExercise, WorkoutPlan } from "../../shared/types";
import type { Database } from "../../db/client";

export async function loadPlan(db: Database, planId: string, userId: string): Promise<WorkoutPlan | null> {
  const [plan] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)))
    .limit(1);
  if (!plan) return null;

  const rows = await db
    .select({
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
    })
    .from(planExercises)
    .innerJoin(exercises, eq(planExercises.exerciseId, exercises.id))
    .where(eq(planExercises.planId, planId))
    .orderBy(asc(planExercises.order));

  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    description: plan.description,
    createdAt: plan.createdAt,
    exercises: rows as PlanExercise[],
  };
}
