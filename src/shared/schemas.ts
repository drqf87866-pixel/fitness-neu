import { z } from "zod";

/** Feldnamen für Fehlermeldungen – die API liefert die erste Meldung direkt an den Toast. */
const FIELD_LABELS: Record<string, string> = {
  email: "E-Mail",
  name: "Name",
  password: "Passwort",
  currentPassword: "Aktuelles Passwort",
  newPassword: "Neues Passwort",
  targetGoal: "Ziel",
  weightKg: "Körpergewicht",
  experienceLevel: "Erfahrung",
  calorieTarget: "Kalorienziel",
  unit: "Einheit",
  title: "Name",
  description: "Beschreibung",
  prompt: "Beschreibung",
  primaryMuscle: "Muskelgruppe",
  secondaryMuscles: "Weitere Muskeln",
  equipment: "Equipment",
  category: "Kategorie",
  targetSets: "Sätze",
  targetReps: "Wiederholungen",
  weight: "Gewicht",
  reps: "Wiederholungen",
  exercises: "Übungen",
  sets: "Sätze",
};

z.setErrorMap((issue, ctx) => {
  const field = [...issue.path].reverse().find((part) => typeof part === "string");
  const label = typeof field === "string" ? FIELD_LABELS[field] : undefined;
  const prefix = label ? `${label}: ` : "";
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined") return { message: `${prefix}Angabe fehlt` };
      if (issue.expected === "integer") return { message: `${prefix}Ganze Zahl erwartet` };
      return { message: `${prefix}Ungültiger Wert` };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return {
          message:
            Number(issue.minimum) <= 1
              ? `${prefix}darf nicht leer sein`
              : `${prefix}mindestens ${issue.minimum} Zeichen`,
        };
      }
      if (issue.type === "array") return { message: `${prefix}mindestens ${issue.minimum} Einträge` };
      return { message: `${prefix}mindestens ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `${prefix}höchstens ${issue.maximum} Zeichen` };
      if (issue.type === "array") return { message: `${prefix}höchstens ${issue.maximum} Einträge` };
      return { message: `${prefix}höchstens ${issue.maximum}` };
    case z.ZodIssueCode.invalid_string:
      return { message: issue.validation === "email" ? "Ungültige E-Mail-Adresse" : `${prefix}Ungültiges Format` };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `${prefix}Ungültige Auswahl` };
    case z.ZodIssueCode.not_multiple_of:
      return { message: `${prefix}Ganze Zahl erwartet` };
    default:
      return { message: ctx.defaultError };
  }
});

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

export const alternativesRequestSchema = z.object({
  exerciseId: z.string().min(1),
});

export const aiAlternativesSchema = z.object({
  alternatives: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        reason: z.string().max(200).optional().default(""),
      }),
    )
    .min(1)
    .max(6),
});

export const startSessionSchema = z.object({
  planId: z.string().min(1).nullable().optional(),
  id: z.string().min(1).optional(),
});

/** Abschließen ist endgültig: `completedAt` lässt sich setzen, aber nicht zurücknehmen. */
export const patchSessionSchema = z.object({
  completedAt: z.number().int().positive().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Zeitraum für Listen und Auswertungen (ms seit Epoch), höchstens gut ein Jahr. */
export const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;
export const rangeQuerySchema = z
  .object({
    from: z.coerce.number().int().nonnegative().optional(),
    to: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((range) => range.from === undefined || range.to === undefined || range.from <= range.to, {
    message: "Ungültiger Zeitraum",
  })
  .refine(
    (range) =>
      range.from === undefined || range.to === undefined || range.to - range.from <= MAX_RANGE_MS,
    { message: "Zeitraum zu groß" },
  );

export const setLogInputSchema = z.object({
  id: z.string().min(1).optional(),
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1).max(30),
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(200),
  isCompleted: z.boolean(),
});

export const upsertSetsSchema = z.object({
  sets: z
    .array(setLogInputSchema)
    .max(200)
    .refine(
      (sets) => {
        const ids = sets.flatMap((set) => (set.id ? [set.id] : []));
        return new Set(ids).size === ids.length;
      },
      { message: "Doppelte Satz-IDs" },
    ),
});
