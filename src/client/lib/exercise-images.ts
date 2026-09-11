/** Herkunft der Übungsbilder, Details in CREDITS.md. */
const FREE_EXERCISE_DB = "Free Exercise DB (Public Domain)";
const WORKOUT_GUIDE = "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)";

/** Übungs-IDs mit Bildern unter public/exercises/<id>/{0,1}.jpg, nach Quelle. */
const IMAGE_SOURCES: Array<{ credit: string; ids: string[] }> = [
  {
    credit: FREE_EXERCISE_DB,
    ids: [
      "ex_bankdruecken",
      "ex_schraegbank",
      "ex_fliegende",
      "ex_dips",
      "ex_liegestuetze",
      "ex_schulterdruecken",
      "ex_military_press",
      "ex_seitheben",
      "ex_close_grip_bench",
      "ex_klimmzuege",
      "ex_rudern_lh",
      "ex_kreuzheben",
      "ex_rdl",
      "ex_shrugs",
      "ex_bizepscurls",
      "ex_hammer_curls",
      "ex_sz_curls",
      "ex_kniebeugen",
      "ex_goblet",
      "ex_ausfallschritte",
      "ex_bulgarisch",
      "ex_hip_thrust",
      "ex_plank",
      "ex_crunches",
      "ex_hanging_raises",
      "ex_kabel_crossover",
      "ex_pec_deck",
      "ex_rudern_kabel",
      "ex_latzug",
      "ex_straight_arm_pulldown",
      "ex_face_pulls",
      "ex_rudern_brustgestuetzt",
      "ex_rudern_tbar",
      "ex_reverse_fly_maschine",
      "ex_beinpresse",
      "ex_beinstrecker",
      "ex_hack_squat",
      "ex_beinbeuger_liegend",
      "ex_hip_thrust_maschine",
      "ex_wadenheben",
      "ex_trizeps_seil",
      "ex_kabelcurl_ez",
      "ex_bizepsmaschine",
      "ex_kabel_crunch",
      "ex_pallof",
    ],
  },
  {
    credit: WORKOUT_GUIDE,
    ids: [
      "ex_abduktoren",
      "ex_adduktoren",
      "ex_beinbeuger_sitzend",
      "ex_brustpresse",
      "ex_einarm_rudern",
      "ex_kabel_seitheben",
      "ex_latzug_eng",
      "ex_rueckenstrecker",
      "ex_schulterpresse_maschine",
      "ex_seitheben_maschine",
      "ex_trizeps_ueberkopf_seil",
      "ex_trizepsmaschine",
      "ex_wadenheben_sitzend",
    ],
  },
];

const creditById = new Map(
  IMAGE_SOURCES.flatMap((source) => source.ids.map((id) => [id, source.credit] as const)),
);

/** Alle Bildquellen – für die Attribution im Profil (CC BY-SA verlangt Namensnennung). */
export const IMAGE_CREDITS = IMAGE_SOURCES.map((source) => source.credit);

const IMAGE_BASE = "/exercises/";

export function getExerciseImage(id: string): { src0: string; src1: string; credit: string } | null {
  const credit = creditById.get(id);
  if (!credit) return null;
  return {
    src0: `${IMAGE_BASE}${id}/0.jpg`,
    src1: `${IMAGE_BASE}${id}/1.jpg`,
    credit,
  };
}

export function getExerciseThumbnail(id: string): string | null {
  return creditById.has(id) ? `${IMAGE_BASE}${id}/0.jpg` : null;
}
