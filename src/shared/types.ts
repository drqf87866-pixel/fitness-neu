export type Unit = "kg" | "lbs";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type ExerciseCategory = "push" | "pull" | "legs" | "core" | "cardio" | "other";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  targetGoal: string | null;
  weightKg: number | null;
  experienceLevel: ExperienceLevel | null;
  calorieTarget: number | null;
  unit: Unit;
  createdAt: number;
};

export type Exercise = {
  id: string;
  name: string;
  category: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  isCustom: boolean;
  userId: string | null;
};

export type PlanExercise = {
  id: string;
  planId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  targetSets: number;
  targetReps: string;
  order: number;
  restSeconds: number;
  suggestedWeight: number | null;
};

export type WorkoutPlan = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  createdAt: number;
  exercises: PlanExercise[];
};

export type SetLog = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
};

export type WorkoutSession = {
  id: string;
  userId: string;
  planId: string | null;
  planTitle: string | null;
  startedAt: number;
  completedAt: number | null;
  notes: string | null;
  sets: SetLog[];
  exercises: Array<{
    exerciseId: string;
    name: string;
    primaryMuscle: string;
    restSeconds: number;
    targetReps: string | null;
    suggestedWeight: number | null;
  }>;
};

/** Kompakte Kennzahlen einer Session für die Verlaufsliste. */
export type SessionSummary = {
  id: string;
  planId: string | null;
  planTitle: string | null;
  startedAt: number;
  completedAt: number | null;
  notes: string | null;
  /** Anzahl abgeschlossener Sätze. */
  setCount: number;
  /** Volumen der abgeschlossenen Sätze in kg. */
  volumeKg: number;
};

export type PreviousSet = {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxWeightReps: number;
  estimated1rm: number;
  achievedAt: number;
};

export type VolumePoint = {
  week: string;
  primaryMuscle: string;
  volume: number;
};

export type MuscleVolume = {
  primaryMuscle: string;
  /** Volumen der abgeschlossenen Sätze der letzten 7 Tage in kg. */
  volume: number;
  /** Anzahl abgeschlossener Sätze der letzten 7 Tage. */
  setCount: number;
  /** Letzter abgeschlossene Satz dieser Muskelgruppe (max. 365 Tage zurück). */
  lastTrainedAt: number | null;
};
