// Generiert src/client/lib/exercise-images.ts aus mapping.json (free-exercise-db,
// Public Domain) + mapping-workout-guide.json (Everkinetic/@bryllim/workout-guide,
// CC BY-SA 4.0 — für Übungen, die im free-exercise-db-Datensatz fehlen, siehe
// scripts/fetch-workout-guide-images.mjs).

import { readFileSync, writeFileSync } from "fs";

const mapping = JSON.parse(readFileSync("scripts/mapping.json", "utf-8"));
let wgMapping = [];
try {
  wgMapping = JSON.parse(readFileSync("scripts/mapping-workout-guide.json", "utf-8"));
} catch {}
const sql = readFileSync("src/db/seed.sql", "utf-8");

// Extract all seed IDs
const seedIds = new Set();
const rx = /\(\s*'([^']+)'/g;
let m;
while ((m = rx.exec(sql)) !== null) {
  seedIds.add(m[1]);
}

// workout-guide/Everkinetic hat Vorrang vor mapping.json: generate-mapping.js trägt
// für JEDE Übung einen "besten" Treffer ein, notfalls auch ein Score-0-Fallback ohne
// erkennbaren Bezug (z. B. "Decline Smith Press" für ex_brustpresse) — solche
// Einträge wurden nie heruntergeladen/kuratiert. Für alle ids, die wir gezielt über
// workout-guide beliefert haben, ignorieren wir mapping.json daher komplett.
const wgIds = new Set(wgMapping.map((e) => e.Id));

// Build imageMap entries (free-exercise-db, Public Domain)
const imageEntries = mapping
  .filter((e) => seedIds.has(e.Id) && !wgIds.has(e.Id))
  .map((e) => {
    const image0 = e.Image0.replace(/\\/g, "/");
    const image1 = e.Image1.replace(/\\/g, "/");
    return `  ${e.Id}: { image0: "${e.Id}/0.jpg", image1: "${e.Id}/1.jpg", credit: "Free Exercise DB (Public Domain)" },`;
  });

// Build imageMap entries (workout-guide/Everkinetic, CC BY-SA 4.0 — Attributionspflicht)
for (const e of wgMapping) {
  if (!seedIds.has(e.Id)) continue;
  const credit = `Illustration: ${e.Creator} / workout-guide, nach Everkinetic (CC BY-SA 4.0)`;
  imageEntries.push(
    `  ${e.Id}: { image0: "${e.Id}/0.jpg", image1: "${e.Id}/1.jpg", credit: "${credit}" },`
  );
}

// Find aliases that are NOT in seed.sql (should be none now)
const aliasEntries = [];
const mappedIds = new Set(mapping.map((e) => e.Id));
for (const id of seedIds) {
  if (!mappedIds.has(id)) {
    // This would be unusual
  }
}

const content = `const imageMap: Record<string, { image0: string; image1: string; credit: string }> = {
${imageEntries.join("\n")}
};

const aliasMap: Record<string, string> = {
};

const IMAGE_BASE = "/exercises/";

function resolveImageEntry(id: string): { image0: string; image1: string; credit: string } | null {
  if (id in imageMap) return imageMap[id];
  const alias = aliasMap[id];
  if (alias && alias in imageMap) return imageMap[alias];
  return null;
}

export function getExerciseImage(id: string): { src0: string; src1: string; credit: string } | null {
  const entry = resolveImageEntry(id);
  if (!entry) return null;
  return {
    src0: \`\${IMAGE_BASE}\${entry.image0}\`,
    src1: \`\${IMAGE_BASE}\${entry.image1}\`,
    credit: entry.credit,
  };
}

export function getExerciseThumbnail(id: string): string | null {
  const entry = resolveImageEntry(id);
  if (!entry) return null;
  return \`\${IMAGE_BASE}\${entry.image0}\`;
}
`;

writeFileSync("src/client/lib/exercise-images.ts", content);
console.log(`Generated exercise-images.ts with ${imageEntries.length} direct entries`);
