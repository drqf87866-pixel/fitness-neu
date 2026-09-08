import { z } from "zod";

export const experienceLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const unitSchema = z.enum(["kg", "lbs"]);
export const categorySchema = z.enum(["push", "pull", "legs", "core", "cardio", "other"]);

export const registerSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetGoal: z.string().trim().max(200).nullable().optional(),
  weightKg: z.number().positive().max(400).nullable().optional(),
  experienceLevel: experienceLevelSchema.nullable().optional(),
  calorieTarget: z.number().int().min(800).max(8000).nullable().optional(),
  unit: unitSchema.optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const exerciseCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: categorySchema,
  primaryMuscle: z.string().trim().min(1).max(40),
  secondaryMuscles: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  equipment: z.string().trim().min(1).max(40),
});

export const exerciseUpdateSchema = exerciseCreateSchema.partial();

export const planExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.string().trim().min(1).max(20),
  order: z.number().int().min(0).max(100),
  restSeconds: z.number().int().min(0).max(600).optional(),
  suggestedWeight: z.number().min(0).max(1000).nullable().optional(),
});

export const planCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  exercises: z.array(planExerciseInputSchema).max(40).default([]),
});

export const planUpdateSchema = planCreateSchema.partial();

export const generatePlanSchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
});

export const aiPlanSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        sets: z.number().int().min(1).max(12),
        reps: z.union([z.string(), z.number()]).transform((v) => String(v)),
        restSeconds: z.number().int().min(0).max(600).optional(),
        suggestedWeight: z.number().min(0).max(1000).optional().nullable(),
        order: z.number().int().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const startSessionSchema = z.object({
  planId: z.string().min(1).nullable().optional(),
  id: z.string().min(1).optional(),
});

export const patchSessionSchema = z.object({
  completedAt: z.number().int().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const setLogInputSchema = z.object({
  id: z.string().min(1).optional(),
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(30),
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(200),
  isCompleted: z.boolean(),
});

export const upsertSetsSchema = z.object({
  sets: z.array(setLogInputSchema).max(200),
});
