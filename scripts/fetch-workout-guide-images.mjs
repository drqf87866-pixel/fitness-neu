// Lädt Bilder für Übungen, die im free-exercise-db-Mapping (mapping.json) fehlen,
// aus dem Open-Source-Projekt "@bryllim/workout-guide" (CC BY-SA 4.0, basiert auf
// Everkinetic-Posen, siehe https://github.com/bryllim/workout-guide).
//
// Anders als free-exercise-db liefert dieses Projekt Vektor-Strichzeichnungen
// (3 Frames je Übung, weiß auf transparent) statt Fotos. Wir rendern zwei Frames
// (Start-/Endposition) zu JPEG, damit sie sich in die bestehende
// public/exercises/<id>/{0,1}.jpg-Struktur einfügen.
//
// Schreibt:
//   - public/exercises/<id>/0.jpg, 1.jpg
//   - scripts/mapping-workout-guide.json (Id, Slug, Frames, Attribution je Übung)

import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";

const REPO_RAW = "https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide";

// Lokale Übungs-id → workout-guide-Slug. Manuell recherchiert (siehe Plan/Chat):
// für jede der 13 Übungen ohne Bild wurde der Slug mit dem passendsten equipment-Tag
// aus packages/workout-guide/manifest.json ausgewählt.
const SLUG_MAP = {
  ex_abduktoren: "hip-abduction-machine",
  ex_adduktoren: "hip-adduction-machine",
  ex_beinbeuger_sitzend: "seated-leg-curl",
  ex_brustpresse: "machine-chest-press",
  ex_einarm_rudern: "one-arm-dumbbell-row",
  ex_kabel_seitheben: "cable-lateral-raise",
  ex_latzug_eng: "close-grip-lat-pulldown",
  ex_rueckenstrecker: "back-extension",
  ex_schulterpresse_maschine: "machine-shoulder-press",
  ex_seitheben_maschine: "machine-lateral-raise",
  ex_trizeps_ueberkopf_seil: "overhead-tricep-extension",
  ex_trizepsmaschine: "tricep-pushdown",
  ex_wadenheben_sitzend: "seated-calf-raise",
};

// frame-3 = Startposition (Gewicht angelegt), frame-1 = Endposition (kontrahiert).
// Dient als image0/image1, analog zu den zwei Foto-Winkeln bei free-exercise-db.
const FRAME_START = 3;
const FRAME_END = 1;

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}

async function svgToJpeg(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  const svg = Buffer.from(await r.arrayBuffer());
  // Die Assets sind weiße Strichzeichnungen auf transparentem Grund (fürs Dark-Theme
  // der workout-guide-Website gedacht). Auf Schwarz rendern und dann invertieren
  // ergibt schwarze Linien auf weißem Grund, passend zu unseren Karten.
  return sharp(svg, { density: 300 })
    .resize(1024, 1024, { fit: "contain", background: "#000000" })
    .flatten({ background: "#000000" })
    .negate({ alpha: false })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function main() {
  const manifest = await fetchJson(`${REPO_RAW}/manifest.json`);
  const bySlug = new Map(manifest.map((e) => [e.slug, e]));

  const mapping = [];
  let ok = 0;
  let failed = 0;

  for (const [id, slug] of Object.entries(SLUG_MAP)) {
    const entry = bySlug.get(slug);
    if (!entry) {
      console.error(`FEHLT im manifest.json: ${slug} (${id})`);
      failed++;
      continue;
    }

    const frameStart = entry.frames.find((f) => f.index === FRAME_START);
    const frameEnd = entry.frames.find((f) => f.index === FRAME_END);
    if (!frameStart || !frameEnd) {
      console.error(`Frames fehlen für ${slug} (${id})`);
      failed++;
      continue;
    }

    const dir = `public/exercises/${id}`;
    mkdirSync(dir, { recursive: true });

    try {
      const [jpg0, jpg1] = await Promise.all([
        svgToJpeg(`${REPO_RAW}/${frameStart.path}`),
        svgToJpeg(`${REPO_RAW}/${frameEnd.path}`),
      ]);
      writeFileSync(`${dir}/0.jpg`, jpg0);
      writeFileSync(`${dir}/1.jpg`, jpg1);
      console.log(`OK: ${id} <- workout-guide/${slug}`);
      ok++;
    } catch (err) {
      console.error(`FAIL: ${id} (${slug}): ${err.message}`);
      failed++;
      continue;
    }

    const src = entry.attribution.source;
    mapping.push({
      Id: id,
      Slug: slug,
      ExerciseName: entry.name,
      Equipment: entry.equipment,
      Creator: entry.attribution.creator,
      CreatorUrl: entry.attribution.creatorUrl,
      License: entry.attribution.license,
      LicenseUrl: entry.attribution.licenseUrl,
      EverkineticSourceUrl: src ? src.url : null,
    });
  }

  writeFileSync("scripts/mapping-workout-guide.json", JSON.stringify(mapping, null, 2));
  console.log(`\nFertig: ${ok} OK, ${failed} fehlgeschlagen`);
  console.log("scripts/mapping-workout-guide.json geschrieben.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
