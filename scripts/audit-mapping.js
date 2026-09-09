import { readFileSync, existsSync } from "fs";

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
console.log(`Seed exercises: ${seedExercises.length}`);

// ── 2. Load exercises-all.json ─────────────────────────────────────
const db = JSON.parse(readFileSync("scripts/exercises-all.json", "utf-8"));
console.log(`Exercise DB entries: ${db.length}`);

// Build index by name for fast lookup
const dbByName = {};
for (const item of db) {
  dbByName[item.name] = item;
}

// ── 3. Load current mapping.json ───────────────────────────────────
let currentMapping = [];
try {
  currentMapping = JSON.parse(readFileSync("scripts/mapping.json", "utf-8"));
} catch {}
console.log(`Current mapping entries: ${currentMapping.length}\n`);

// ── 4. Mapping helpers ────────────────────────────────────────────
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
  upper_back: "traps",
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

function nameSimilarity(a, b) {
  const aWords = a.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
  const bWords = b.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2);
  let matches = 0;
  for (const wa of aWords) {
    if (bWords.some(wb => wb.includes(wa) || wa.includes(wb))) matches++;
  }
  return aWords.length > 0 ? matches / Math.max(aWords.length, bWords.length) : 0;
}

// ── 5. For each seed exercise, find best candidates ────────────────
console.log("=".repeat(140));
console.log("AUDIT: Alle 144 aus seed.sql gegen exercises-all.json");
console.log("=".repeat(140));

const auditRows = [];

for (const ex of seedExercises) {
  const localEq = normEq(ex.equipment);
  const localMuscle = MUSCLE_MAP[ex.primaryMuscle] || ex.primaryMuscle;

  // Find best equipment+muscle match
  const candidates = db.map((cand) => {
    const candEq = cand.equipment ? cand.equipment.toLowerCase() : "";
    const candMuscles = [
      ...(cand.primaryMuscles || []),
      ...(cand.secondaryMuscles || []),
    ].map((m) => m.toLowerCase());

    const eqMatch = localEq === candEq ? 1 : 0;
    const musExact = localMuscle && candMuscles.includes(localMuscle) ? 1 : 0;
    const nameSim = nameSimilarity(ex.name, cand.name);

    // Score: equipment dominant, then muscle, then name similarity as tiebreaker
    const score = eqMatch * 100 + musExact * 20 + nameSim * 10;

    return { candidate: cand, eqMatch, musExact, nameSim, score };
  });

  candidates.sort((a, b) => b.score - a.score);

  // Best equipment+g muscle match (preferring same name similarity)
  const bestOverall = candidates[0];
  const bestEqMatch = candidates.find((c) => c.eqMatch === 1) || null;
  const bestEqMuscleMatch = candidates.find(
    (c) => c.eqMatch === 1 && c.musExact === 1
  ) || null;

  // ── Current mapping evaluation ──
  const current = currentMapping.find((m) => m.Id === ex.id);
  const currentDbEntry = current ? dbByName[current.ExerciseName] : null;

  // Determine verdict
  let verdict = "ok";
  let reason = "";
  let currentScore = 0;

  if (!current) {
    verdict = "missing";
    reason = "Nicht in mapping.json";
  } else if (!currentDbEntry) {
    // Try to find by partial name match
    const partialMatch = db.find(
      (d) =>
        d.name.toLowerCase().includes(current.ExerciseName.toLowerCase()) ||
        current.ExerciseName.toLowerCase().includes(d.name.toLowerCase())
    );
    if (partialMatch) {
      verdict = "fraglich";
      reason = `Name '${current.ExerciseName}' nicht exakt, aber ähnlich → '${partialMatch.name}'`;
      // Re-evaluate with partial match
      const candEq = partialMatch.equipment ? partialMatch.equipment.toLowerCase() : "";
      const candMuscles = [...(partialMatch.primaryMuscles || []), ...(partialMatch.secondaryMuscles || [])].map(m => m.toLowerCase());
      const eqMatch = localEq === candEq ? 1 : 0;
      const musExact = localMuscle && candMuscles.includes(localMuscle) ? 1 : 0;
      currentScore = eqMatch * 100 + musExact * 20;
    } else {
      verdict = "falsch";
      reason = `'${current.ExerciseName}' nicht in exercises-all.json gefunden`;
    }
  } else {
    const candEq = currentDbEntry.equipment ? currentDbEntry.equipment.toLowerCase() : "";
    const candMuscles = [...(currentDbEntry.primaryMuscles || []), ...(currentDbEntry.secondaryMuscles || [])].map(m => m.toLowerCase());
    const eqMatch = localEq === candEq ? 1 : 0;
    const musExact = localMuscle && candMuscles.includes(localMuscle) ? 1 : 0;
    currentScore = eqMatch * 100 + musExact * 20;

    const issues = [];
    if (!eqMatch && localEq !== "other") {
      issues.push(`Equipment: ${ex.equipment}(erwartet) vs ${currentDbEntry.equipment}(aktuell)`);
    }
    if (!musExact && localMuscle) {
      issues.push(`Muskel: ${ex.primaryMuscle}(erwartet) vs ${currentDbEntry.primaryMuscles?.join(",")}(aktuell)`);
    }

    if (issues.length > 0) {
      verdict = "fraglich";
      reason = issues.join(" | ");
    } else {
      // Check if there's a significantly better match
      if (bestEqMuscleMatch && bestEqMuscleMatch.candidate.name !== currentDbEntry.name) {
        const nameSim = nameSimilarity(ex.name, currentDbEntry.name);
        const bestNameSim = nameSimilarity(ex.name, bestEqMuscleMatch.candidate.name);
        if (bestNameSim > nameSim + 0.2) {
          verdict = "fraglich";
          reason = `Besserer Kandidat: '${bestEqMuscleMatch.candidate.name}' (Name-Ähnlichkeit ${bestNameSim.toFixed(2)} vs ${nameSim.toFixed(2)})`;
        }
      }
    }
  }

  // Build best candidate recommendation
  let recommended = bestEqMuscleMatch || bestEqMatch || bestOverall;

  auditRows.push({
    id: ex.id,
    name: ex.name,
    equipment: ex.equipment,
    muscle: ex.primaryMuscle,
    hasImage: existsSync(`public/exercises/${ex.id}/0.jpg`),
    currentMapping: current ? current.ExerciseName : "—",
    currentEq: currentDbEntry?.equipment || "—",
    recommendedName: recommended.candidate.name,
    recommendedEq: recommended.candidate.equipment || "—",
    recommendedMuscles: [...(recommended.candidate.primaryMuscles || []), ...(recommended.candidate.secondaryMuscles || [])].join(","),
    recommendedScore: recommended.score,
    verdict,
    reason,
  });
}

// ── 6. Print report ────────────────────────────────────────────────
for (const v of ["ok", "fraglich", "falsch", "missing"]) {
  const group = auditRows.filter((r) => r.verdict === v);
  if (group.length === 0) continue;
  console.log(`\n## ${v.toUpperCase()} (${group.length})`);
  console.log("-".repeat(140));
  for (const r of group) {
    const img = r.hasImage ? "✓" : "✗";
    const line = `${img} ${r.id.padEnd(36)} ${r.equipment.padEnd(10)} ${r.muscle.padEnd(12)} | aktuell: ${(r.currentMapping + " (" + r.currentEq + ")").padEnd(55)} | ${r.reason || "ok"}`;
    console.log(line);
    if (r.verdict !== "ok") {
      console.log(
        `  → Empfohlen: ${r.recommendedName} (eq:${r.recommendedEq}, mus:${r.recommendedMuscles})`
      );
    }
  }
}

// ── 7. Summary ─────────────────────────────────────────────────────
console.log("\n\n=== ZUSAMMENFASSUNG ===");
console.log(`Gesamt: ${auditRows.length}`);
for (const v of ["ok", "fraglich", "falsch", "missing"]) {
  const count = auditRows.filter((r) => r.verdict === v).length;
  console.log(`  ${v}: ${count}`);
}
console.log(`Bilder vorhanden: ${auditRows.filter((r) => r.hasImage).length}`);
console.log(`Bilder fehlen: ${auditRows.filter((r) => !r.hasImage).length}`);

// ── 8. Detail: Fraglich analysieren ────────────────────────────────
const fraglich = auditRows.filter((r) => r.verdict === "fraglich");
const eqMismatch = fraglich.filter((r) => r.reason.includes("Equipment"));
const nameBetter = fraglich.filter((r) => r.reason.includes("Besserer"));
const namePartial = fraglich.filter((r) => r.reason.includes("ähnlich"));

console.log(`\n\n=== FRAGLICH DETAILL ===`);
console.log(`  Equipment-Mismatch: ${eqMismatch.length}`);
console.log(`  Name nur ähnlich: ${namePartial.length}`);
console.log(`  Besserer Kandidat: ${nameBetter.length}`);

if (eqMismatch.length > 0) {
  console.log(`\n--- Equipment-Mismatch ---`);
  for (const r of eqMismatch) {
    console.log(`  ${r.id.padEnd(36)} ${r.equipment.padEnd(10)} → ${r.currentMapping} (${r.currentEq})`);
  }
}
