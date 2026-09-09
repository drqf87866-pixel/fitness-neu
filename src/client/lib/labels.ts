export const MUSCLE_LABELS: Record<string, string> = {
  chest: "Brust",
  shoulders: "Schultern",
  triceps: "Trizeps",
  biceps: "Bizeps",
  lats: "Latissimus",
  upper_back: "oberer Rücken",
  lower_back: "unterer Rücken",
  traps: "Nacken",
  quads: "Quadrizeps",
  hamstrings: "Beinbeuger",
  glutes: "Gesäß",
  calves: "Waden",
  core: "Rumpf",
  cardio: "Cardio",
  forearms: "Unterarme",
  other: "Sonstiges",
};

/**
 * Grobe Körperbereiche für die Startseiten-Kacheln. Die 14 feinkörnigen
 * `primaryMuscle`-Keys sind dafür zu viele – `cardio` und `other` bleiben
 * bewusst außen vor, da ihr kg-Volumen nicht vergleichbar ist.
 */
export const MUSCLE_GROUPS = [
  { key: "chest", label: "Brust", muscles: ["chest"] },
  { key: "back", label: "Rücken", muscles: ["lats", "upper_back", "lower_back", "traps"] },
  { key: "shoulders", label: "Schultern", muscles: ["shoulders"] },
  { key: "arms", label: "Arme", muscles: ["biceps", "triceps", "forearms"] },
  { key: "legs", label: "Beine", muscles: ["quads", "hamstrings", "glutes", "calves"] },
  { key: "core", label: "Rumpf", muscles: ["core"] },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Beine",
  core: "Rumpf",
  cardio: "Cardio",
  other: "Sonstiges",
};

export const GOAL_LABELS: Record<string, string> = {
  hypertrophy: "Muskelaufbau",
  strength: "Kraft",
  fat_loss: "Fettabbau",
  endurance: "Ausdauer",
  general: "Allgemein",
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Einsteiger",
  intermediate: "Fortgeschritten",
  advanced: "Profi",
};

export function muscleLabel(key: string) {
  return MUSCLE_LABELS[key] ?? key;
}

export const EQUIPMENT_TAGS: Record<string, string> = {
  machine: "Maschine",
  cable: "Kabelzug",
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  bodyweight: "Körpergewicht",
  other: "Sonstiges",
};

export const MOVEMENT_TAGS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Beine",
  core: "Rumpf",
  cardio: "Cardio",
  other: "Sonstiges",
};
