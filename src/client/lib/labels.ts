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
