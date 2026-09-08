const imageMap: Record<string, { image0: string; image1: string; credit: string }> = {
  ex_bankdruecken:       { image0: "ex_bankdruecken/0.jpg", image1: "ex_bankdruecken/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_schraegbank:        { image0: "ex_schraegbank/0.jpg", image1: "ex_schraegbank/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_fliegende:          { image0: "ex_fliegende/0.jpg", image1: "ex_fliegende/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kabelueberzuege:    { image0: "ex_kabelueberzuege/0.jpg", image1: "ex_kabelueberzuege/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_dips:               { image0: "ex_dips/0.jpg", image1: "ex_dips/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_liegestuetze:       { image0: "ex_liegestuetze/0.jpg", image1: "ex_liegestuetze/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_schulterdruecken:   { image0: "ex_schulterdruecken/0.jpg", image1: "ex_schulterdruecken/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_military_press:     { image0: "ex_military_press/0.jpg", image1: "ex_military_press/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_seitheben:          { image0: "ex_seitheben/0.jpg", image1: "ex_seitheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_frontheben:         { image0: "ex_frontheben/0.jpg", image1: "ex_frontheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_face_pulls:         { image0: "ex_face_pulls/0.jpg", image1: "ex_face_pulls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_trizepsdruecken:    { image0: "ex_trizepsdruecken/0.jpg", image1: "ex_trizepsdruecken/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_overhead_triceps:   { image0: "ex_overhead_triceps/0.jpg", image1: "ex_overhead_triceps/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_close_grip_bench:   { image0: "ex_close_grip_bench/0.jpg", image1: "ex_close_grip_bench/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_klimmzuege:         { image0: "ex_klimmzuege/0.jpg", image1: "ex_klimmzuege/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_latzug:             { image0: "ex_latzug/0.jpg", image1: "ex_latzug/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_lh:          { image0: "ex_rudern_lh/0.jpg", image1: "ex_rudern_lh/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_kabel:       { image0: "ex_rudern_kabel/0.jpg", image1: "ex_rudern_kabel/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_einarm_rudern:      { image0: "ex_einarm_rudern/0.jpg", image1: "ex_einarm_rudern/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kreuzheben:         { image0: "ex_kreuzheben/0.jpg", image1: "ex_kreuzheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rdl:                { image0: "ex_rdl/0.jpg", image1: "ex_rdl/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_shrugs:             { image0: "ex_shrugs/0.jpg", image1: "ex_shrugs/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_bizepscurls:        { image0: "ex_bizepscurls/0.jpg", image1: "ex_bizepscurls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hammer_curls:       { image0: "ex_hammer_curls/0.jpg", image1: "ex_hammer_curls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_sz_curls:           { image0: "ex_sz_curls/0.jpg", image1: "ex_sz_curls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kniebeugen:         { image0: "ex_kniebeugen/0.jpg", image1: "ex_kniebeugen/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_frontkniebeugen:    { image0: "ex_frontkniebeugen/0.jpg", image1: "ex_frontkniebeugen/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_goblet:             { image0: "ex_goblet/0.jpg", image1: "ex_goblet/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinpresse:         { image0: "ex_beinpresse/0.jpg", image1: "ex_beinpresse/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_ausfallschritte:    { image0: "ex_ausfallschritte/0.jpg", image1: "ex_ausfallschritte/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_bulgarisch:         { image0: "ex_bulgarisch/0.jpg", image1: "ex_bulgarisch/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinstrecker:       { image0: "ex_beinstrecker/0.jpg", image1: "ex_beinstrecker/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinbeuger:         { image0: "ex_beinbeuger/0.jpg", image1: "ex_beinbeuger/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hip_thrust:         { image0: "ex_hip_thrust/0.jpg", image1: "ex_hip_thrust/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_wadenheben:         { image0: "ex_wadenheben/0.jpg", image1: "ex_wadenheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_plank:              { image0: "ex_plank/0.jpg", image1: "ex_plank/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_crunches:           { image0: "ex_crunches/0.jpg", image1: "ex_crunches/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hanging_raises:     { image0: "ex_hanging_raises/0.jpg", image1: "ex_hanging_raises/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_russian_twist:      { image0: "ex_russian_twist/0.jpg", image1: "ex_russian_twist/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_pallof:             { image0: "ex_pallof/0.jpg", image1: "ex_pallof/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_ab_wheel:           { image0: "ex_ab_wheel/0.jpg", image1: "ex_ab_wheel/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_laufband:           { image0: "ex_laufband/0.jpg", image1: "ex_laufband/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_cardio:      { image0: "ex_rudern_cardio/0.jpg", image1: "ex_rudern_cardio/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_fahrrad:            { image0: "ex_fahrrad/0.jpg", image1: "ex_fahrrad/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_seilspringen:       { image0: "ex_seilspringen/0.jpg", image1: "ex_seilspringen/1.jpg", credit: "Free Exercise DB (Public Domain)" },
};

const aliasMap: Record<string, string> = {
  // Kabel Brust → Fliegende
  ex_kabel_fliegend_hoch: "ex_fliegende",
  ex_kabel_fliegend_mittel: "ex_fliegende",
  ex_kabel_fliegend_tief: "ex_fliegende",
  ex_kabel_crossover: "ex_fliegende",
  ex_kabel_fliegend_einarmig: "ex_fliegende",
  ex_kabel_fliegend_schraeg: "ex_fliegende",
  // Kabel-Brustpresse → Kabelüberzüge
  ex_kabel_brustpresse: "ex_kabelueberzuege",
  // Brustpresse Maschinen → Bankdrücken / Schrägbank
  ex_brustpresse: "ex_bankdruecken",
  ex_brustpresse_schraeg: "ex_schraegbank",
  ex_brustpresse_konvergent: "ex_bankdruecken",
  ex_pec_deck: "ex_fliegende",
  ex_pec_deck_reverse: "ex_face_pulls",

  // Latzug Varianten → Latzug
  ex_latzug_eng: "ex_latzug",
  ex_latzug_neutral: "ex_latzug",
  ex_latzug_supiniert: "ex_latzug",
  ex_latzug_einarmig: "ex_latzug",
  ex_latzug_maschine: "ex_latzug",
  // Kabelrudern Varianten → Rudern Kabel
  ex_rudern_kabel_eng: "ex_rudern_kabel",
  ex_rudern_kabel_breit: "ex_rudern_kabel",
  ex_rudern_kabel_neutral: "ex_rudern_kabel",
  ex_rudern_kabel_einarmig: "ex_rudern_kabel",
  ex_straight_arm_pulldown: "ex_latzug",
  ex_kabel_pullover: "ex_latzug",
  // Face Pulls Varianten
  ex_face_pulls_einarmig: "ex_face_pulls",
  ex_face_pulls_seil: "ex_face_pulls",
  ex_kabel_shrugs: "ex_shrugs",
  // Rudermaschinen → Rudern Langhantel
  ex_rudern_maschine: "ex_rudern_lh",
  ex_rudern_maschine_einarmig: "ex_einarm_rudern",
  ex_rudern_brustgestuetzt: "ex_rudern_lh",
  ex_rudern_tbar: "ex_rudern_lh",
  ex_high_row: "ex_latzug",
  ex_low_row: "ex_rudern_kabel",

  // Kabel Schultern
  ex_kabel_seitheben: "ex_seitheben",
  ex_kabel_seitheben_einarmig: "ex_seitheben",
  ex_kabel_seitheben_hinten: "ex_seitheben",
  ex_kabel_frontheben: "ex_frontheben",
  ex_kabel_reverse_fly: "ex_face_pulls",
  ex_kabel_y_raise: "ex_seitheben",
  ex_kabel_upright_row: "ex_shrugs",
  // Schultern Maschinen
  ex_schulterpresse_maschine: "ex_schulterdruecken",
  ex_schulterpresse_konvergent: "ex_schulterdruecken",
  ex_seitheben_maschine: "ex_seitheben",
  ex_reverse_fly_maschine: "ex_face_pulls",

  // Beinpresse Varianten
  ex_beinpresse_horizontal: "ex_beinpresse",
  ex_beinpresse_vertikal: "ex_beinpresse",
  ex_beinpresse_einbein: "ex_beinpresse",
  ex_beinstrecker_einbein: "ex_beinstrecker",
  // Beinbeuger Varianten
  ex_beinbeuger_liegend: "ex_beinbeuger",
  ex_beinbeuger_sitzend: "ex_beinbeuger",
  ex_beinbeuger_stehend: "ex_beinbeuger",
  ex_beinbeuger_einbein: "ex_beinbeuger",
  // Kniebeuge Maschinen
  ex_hack_squat: "ex_kniebeugen",
  ex_pendulum_squat: "ex_kniebeugen",
  ex_belt_squat: "ex_kniebeugen",
  ex_smith_kniebeuge: "ex_kniebeugen",
  ex_sissy_squat_maschine: "ex_kniebeugen",
  // Gesäß Maschinen
  ex_glute_drive: "ex_hip_thrust",
  ex_hip_thrust_maschine: "ex_hip_thrust",
  ex_kickback_maschine: "ex_ausfallschritte",
  ex_abduktoren: "ex_ausfallschritte",
  ex_adduktoren: "ex_ausfallschritte",
  // Kabel Gesäß
  ex_kabel_kickback: "ex_kniebeugen",
  ex_kabel_pullthrough: "ex_rdl",
  ex_kabel_good_morning: "ex_rdl",
  // Waden Varianten
  ex_wadenheben_sitzend: "ex_wadenheben",
  ex_wadenheben_beinpresse: "ex_wadenheben",
  ex_wadenheben_einbein: "ex_wadenheben",

  // Trizeps Kabel Varianten
  ex_trizeps_seil: "ex_trizepsdruecken",
  ex_trizeps_stange: "ex_trizepsdruecken",
  ex_trizeps_einhand: "ex_trizepsdruecken",
  ex_trizeps_ueberkopf_seil: "ex_overhead_triceps",
  ex_trizeps_kickback_kabel: "ex_trizepsdruecken",
  ex_trizeps_pushdown_einarmig: "ex_trizepsdruecken",
  ex_trizepsmaschine: "ex_trizepsdruecken",

  // Bizeps Kabel Varianten
  ex_kabelcurl_stange: "ex_bizepscurls",
  ex_kabelcurl_ez: "ex_sz_curls",
  ex_kabelcurl_seil: "ex_hammer_curls",
  ex_kabelcurl_tief: "ex_bizepscurls",
  ex_kabelcurl_hoch: "ex_bizepscurls",
  ex_kabelcurl_einarmig: "ex_bizepscurls",
  ex_bayesian_curl: "ex_bizepscurls",
  ex_kabel_crossbody_curl: "ex_bizepscurls",
  ex_bizepsmaschine: "ex_bizepscurls",
  ex_preacher_curl_maschine: "ex_bizepscurls",

  // Core Kabel
  ex_kabel_crunch: "ex_crunches",
  ex_kabel_rotation: "ex_pallof",
  ex_kabel_rotation_kniend: "ex_pallof",
  ex_woodchopper_oben: "ex_pallof",
  ex_woodchopper_unten: "ex_pallof",
  ex_pallof_kniend: "ex_pallof",
  ex_kabel_seitcrunch: "ex_crunches",
  ex_kabel_hueftheben: "ex_hanging_raises",
  // Core Maschinen
  ex_crunch_maschine: "ex_crunches",
  ex_rueckenstrecker: "ex_plank",

  // Cardio Geräte
  ex_stairmaster: "ex_laufband",
  ex_ellips_trainer: "ex_laufband",
  ex_airbike: "ex_laufband",
  ex_ski_erg: "ex_rudern_cardio",
  ex_assault_bike: "ex_laufband",
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
    src0: `${IMAGE_BASE}${entry.image0}`,
    src1: `${IMAGE_BASE}${entry.image1}`,
    credit: entry.credit,
  };
}

export function getExerciseThumbnail(id: string): string | null {
  const entry = resolveImageEntry(id);
  if (!entry) return null;
  return `${IMAGE_BASE}${entry.image0}`;
}
