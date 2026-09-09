// Schritt 2: Generiert vollständiges mapping.json (144 Einträge)
// Strategie: Equipment zuerst, dann Muskel, dann Namensähnlichkeit
// Bestehende OK-Mappings bleiben erhalten

import { readFileSync, writeFileSync } from "fs";

// ── 1. Parse seed.sql ──────────────────────────────────────────────
const sql = readFileSync("src/db/seed.sql", "utf-8");
const exerciseRx =
  /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*('[^']*')\s*,\s*'([^']+)'/g;

const seedExercises = [];
let m;
while ((m = exerciseRx.exec(sql)) !== null) {
  let secStr = m[5];
  if (secStr.startsWith("'") && secStr.endsWith("'")) secStr = secStr.slice(1, -1);
  secStr = secStr.replace(/'/g, '"');
  seedExercises.push({
    id: m[1],
    name: m[2],
    category: m[3],
    primaryMuscle: m[4],
    secondaryMuscles: JSON.parse(secStr),
    equipment: m[6],
  });
}

// ── 2. Load exercises-all.json ─────────────────────────────────────
const db = JSON.parse(readFileSync("scripts/exercises-all.json", "utf-8"));

// ── 3. Load current mapping.json ───────────────────────────────────
let currentMapping = [];
try {
  currentMapping = JSON.parse(readFileSync("scripts/mapping.json", "utf-8"));
} catch {}
const currentById = {};
for (const entry of currentMapping) {
  currentById[entry.Id] = entry;
}

// ── 4. Helpers ─────────────────────────────────────────────────────
const EQUIP_MAP = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  bodyweight: "body only",
  cable: "cable",
  machine: "machine",
  other: "other",
  "e-z curl bar": "e-z curl bar",
};

const MUSCLE_MAP = {
  chest: "chest",
  shoulders: "shoulders",
  triceps: "triceps",
  biceps: "biceps",
  lats: "lats",
  upper_back: ["traps", "middle back"],
  hamstrings: "hamstrings",
  glutes: "glutes",
  quads: "quadriceps",
  core: "abdominals",
  lower_back: "lower back",
  traps: "traps",
  calves: "calves",
  cardio: null,
  forearms: "forearms",
};

function normEq(eq) {
  return EQUIP_MAP[eq] || eq;
}

function getTargetMuscles(muscle) {
  const m = MUSCLE_MAP[muscle];
  if (!m) return [];
  return Array.isArray(m) ? m : [m];
}

function nameSimilarity(a, b) {
  const aWords = a.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
  const bWords = b.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
  let matches = 0;
  for (const wa of aWords) {
    if (bWords.some(wb => wb.includes(wa) || wa.includes(wb))) matches++;
  }
  return aWords.length > 0 ? matches / Math.max(aWords.length, bWords.length, 1) : 0;
}

// ── 5. Manual overrides for known tricky cases ─────────────────────
const MANUAL_OVERRIDES = {
  // Equipment-Mismatch fixes
  ex_bizepscurls:       "Dumbbell Bicep Curl",
  ex_overhead_triceps:  "Standing Dumbbell Triceps Extension",
  ex_russian_twist:     "Russian Twist",
  ex_wadenheben:        "Standing Calf Raises",
  ex_fahrrad:           "Recumbent Bike",
  // Better name match (same equipment)
  ex_military_press:    "Standing Military Press",
  ex_hammer_curls:      "Hammer Curls",
  ex_crunches:          "Crunches",
  ex_sz_curls:          "EZ-Bar Curl",
  ex_einarm_rudern:     "One-Arm Dumbbell Row",
  // Revert dips to chest version (visually correct despite 'other' tag)
  ex_dips:              "Dips - Chest Version",
};

// ── 6. Find best match for each exercise ───────────────────────────
const newMapping = [];

for (const ex of seedExercises) {
  // Check manual override first
  if (MANUAL_OVERRIDES[ex.id]) {
    const overrideName = MANUAL_OVERRIDES[ex.id];
    const found = db.find(d => d.name === overrideName);
    if (found) {
      newMapping.push({
        Id: ex.id,
        ExerciseName: found.name,
        Image0: found.images[0],
        Image1: found.images[1],
      });
      continue;
    }
    console.warn(`Manual override '${overrideName}' for ${ex.id} not found in DB`);
  }

  // Check if current mapping is OK (equipment + muscle match)
  const current = currentById[ex.id];
  if (current) {
    const currentDb = db.find(d => d.name === current.ExerciseName);
    if (currentDb) {
      const localEq = normEq(ex.equipment);
      const candEq = currentDb.equipment ? currentDb.equipment.toLowerCase() : "";
      const localMuscles = getTargetMuscles(ex.primaryMuscle);
      const candMuscles = [
        ...(currentDb.primaryMuscles || []),
        ...(currentDb.secondaryMuscles || []),
      ].map(m => m.toLowerCase());

      const eqMatch = localEq === candEq;
      const musMatch = localMuscles.length === 0 || localMuscles.some(lm => candMuscles.includes(lm));

      // Also check: is this a cardio exercise? Cardio muscle check is loose
      const isCardio = ex.primaryMuscle === "cardio";

      if (eqMatch && (musMatch || isCardio)) {
        // Keep current mapping
        newMapping.push(current);
        continue;
      }
    }
  }

  // Find best match
  const localEq = normEq(ex.equipment);
  const targetMuscles = getTargetMuscles(ex.primaryMuscle);
  const isCardio = ex.primaryMuscle === "cardio";

  const scored = db.map((cand) => {
    const candEq = cand.equipment ? cand.equipment.toLowerCase() : "";
    const candMuscles = [
      ...(cand.primaryMuscles || []),
      ...(cand.secondaryMuscles || []),
    ].map(m => m.toLowerCase());

    const eqMatch = localEq === candEq ? 1 : 0;
    const musMatch =
      targetMuscles.length === 0 || isCardio
        ? 1
        : targetMuscles.some((tm) => candMuscles.includes(tm))
          ? 1
          : 0;
    const nameSim = nameSimilarity(ex.name, cand.name);

    // Score: equipment dominant, then muscle, then name
    const score = eqMatch * 1000 + musMatch * 100 + nameSim;

    return { candidate: cand, eqMatch, musMatch, nameSim, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Best: equipment match + muscle match with best name similarity
  let best = scored.find((s) => s.eqMatch === 1 && s.musMatch === 1) ||
             scored.find((s) => s.eqMatch === 1) ||
             scored.find((s) => s.musMatch === 1) ||
             scored[0];

  // For equipment type "other", prefer muscle match over equipment
  if (localEq === "other" || localEq === "body only") {
    const muscleFirst = scored.find((s) => s.musMatch === 1 && s.eqMatch === 1) ||
                        scored.find((s) => s.musMatch === 1);
    if (muscleFirst) best = muscleFirst;
  }

  newMapping.push({
    Id: ex.id,
    ExerciseName: best.candidate.name,
    Image0: best.candidate.images[0],
    Image1: best.candidate.images[1],
  });
}

// ── 7. Verify & write ──────────────────────────────────────────────
console.log(`Generated ${newMapping.length} mapping entries`);

// Check for duplicates
const ids = newMapping.map(e => e.Id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length > 0) {
  console.error(`DUPLICATE IDs: ${dupes.join(", ")}`);
  process.exit(1);
}

// Check all seed IDs are present
const seedIds = new Set(seedExercises.map(e => e.id));
const mappedIds = new Set(newMapping.map(e => e.Id));
const missing = [...seedIds].filter(id => !mappedIds.has(id));
if (missing.length > 0) {
  console.error(`MISSING IDs: ${missing.join(", ")}`);
  process.exit(1);
}

// Count changes from original
let changed = 0;
let added = 0;
for (const entry of newMapping) {
  const orig = currentById[entry.Id];
  if (!orig) {
    added++;
  } else if (orig.ExerciseName !== entry.ExerciseName) {
    changed++;
  }
}
console.log(`Kept unchanged: ${currentMapping.length - changed}`);
console.log(`Changed: ${changed}`);
console.log(`Added (new): ${added}`);

// Summary by equipment/muscle
let eqOk = 0, eqBad = 0;
for (const entry of newMapping) {
  const ex = seedExercises.find(e => e.id === entry.Id);
  const dbEntry = db.find(d => d.name === entry.ExerciseName);
  if (ex && dbEntry) {
    const localEq = normEq(ex.equipment);
    const candEq = dbEntry.equipment ? dbEntry.equipment.toLowerCase() : "";
    if (localEq === candEq || (localEq === "other" && ex.equipment === "other")) {
      eqOk++;
    } else {
      eqBad++;
      console.warn(`  Equipment-Mismatch bleibt: ${entry.Id} (${ex.equipment} → ${dbEntry.equipment})`);
    }
  }
}
console.log(`\nEquipment-Matches: ${eqOk}, Mismatches: ${eqBad}`);

writeFileSync("scripts/mapping.json", JSON.stringify(newMapping, null, 2));
console.log("\nscripts/mapping.json written successfully!");
