import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("sessions_expires_idx").on(table.expiresAt)],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("rate_limits_expires_idx").on(table.expiresAt)],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  targetGoal: text("target_goal"),
  weightKg: real("weight_kg"),
  experienceLevel: text("experience_level"),
  calorieTarget: integer("calorie_target"),
  unit: text("unit", { enum: ["kg", "lbs"] })
    .notNull()
    .default("kg"),
  createdAt: integer("created_at").notNull(),
});

export const exercises = sqliteTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    primaryMuscle: text("primary_muscle").notNull(),
    secondaryMuscles: text("secondary_muscles").notNull().default("[]"),
    equipment: text("equipment").notNull(),
    isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
    userId: text("user_id").references(() => users.id),
  },
  (table) => [index("exercises_user_idx").on(table.userId), index("exercises_category_idx").on(table.category)],
);

export const workoutPlans = sqliteTable(
  "workout_plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("workout_plans_user_idx").on(table.userId)],
);

export const planExercises = sqliteTable(
  "plan_exercises",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => workoutPlans.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    targetSets: integer("target_sets").notNull(),
    targetReps: text("target_reps").notNull(),
    order: integer("order").notNull(),
    restSeconds: integer("rest_seconds").notNull().default(90),
    suggestedWeight: real("suggested_weight"),
  },
  (table) => [
    index("plan_exercises_plan_idx").on(table.planId),
    index("plan_exercises_exercise_idx").on(table.exerciseId),
  ],
);

export const workoutLogs = sqliteTable(
  "workout_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    planId: text("plan_id").references(() => workoutPlans.id),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    notes: text("notes"),
  },
  (table) => [
    index("workout_logs_user_started_idx").on(table.userId, table.startedAt),
    index("workout_logs_plan_idx").on(table.planId),
    // Höchstens ein offenes Training pro Nutzer – auch bei parallelen Starts.
    uniqueIndex("workout_logs_one_open_idx")
      .on(table.userId)
      .where(sql`completed_at IS NULL`),
  ],
);

export const setLogs = sqliteTable(
  "set_logs",
  {
    id: text("id").primaryKey(),
    workoutLogId: text("workout_log_id")
      .notNull()
      .references(() => workoutLogs.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    setNumber: integer("set_number").notNull(),
    weight: real("weight").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("set_logs_workout_idx").on(table.workoutLogId),
    index("set_logs_exercise_idx").on(table.exerciseId),
  ],
);
