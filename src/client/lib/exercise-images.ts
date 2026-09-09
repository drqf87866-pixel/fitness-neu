const imageMap: Record<string, { image0: string; image1: string; credit: string }> = {
  ex_bankdruecken: { image0: "ex_bankdruecken/0.jpg", image1: "ex_bankdruecken/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_schraegbank: { image0: "ex_schraegbank/0.jpg", image1: "ex_schraegbank/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_fliegende: { image0: "ex_fliegende/0.jpg", image1: "ex_fliegende/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_dips: { image0: "ex_dips/0.jpg", image1: "ex_dips/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_liegestuetze: { image0: "ex_liegestuetze/0.jpg", image1: "ex_liegestuetze/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_schulterdruecken: { image0: "ex_schulterdruecken/0.jpg", image1: "ex_schulterdruecken/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_military_press: { image0: "ex_military_press/0.jpg", image1: "ex_military_press/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_seitheben: { image0: "ex_seitheben/0.jpg", image1: "ex_seitheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_close_grip_bench: { image0: "ex_close_grip_bench/0.jpg", image1: "ex_close_grip_bench/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_klimmzuege: { image0: "ex_klimmzuege/0.jpg", image1: "ex_klimmzuege/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_lh: { image0: "ex_rudern_lh/0.jpg", image1: "ex_rudern_lh/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kreuzheben: { image0: "ex_kreuzheben/0.jpg", image1: "ex_kreuzheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rdl: { image0: "ex_rdl/0.jpg", image1: "ex_rdl/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_shrugs: { image0: "ex_shrugs/0.jpg", image1: "ex_shrugs/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_bizepscurls: { image0: "ex_bizepscurls/0.jpg", image1: "ex_bizepscurls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hammer_curls: { image0: "ex_hammer_curls/0.jpg", image1: "ex_hammer_curls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_sz_curls: { image0: "ex_sz_curls/0.jpg", image1: "ex_sz_curls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kniebeugen: { image0: "ex_kniebeugen/0.jpg", image1: "ex_kniebeugen/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_goblet: { image0: "ex_goblet/0.jpg", image1: "ex_goblet/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_ausfallschritte: { image0: "ex_ausfallschritte/0.jpg", image1: "ex_ausfallschritte/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_bulgarisch: { image0: "ex_bulgarisch/0.jpg", image1: "ex_bulgarisch/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hip_thrust: { image0: "ex_hip_thrust/0.jpg", image1: "ex_hip_thrust/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_plank: { image0: "ex_plank/0.jpg", image1: "ex_plank/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_crunches: { image0: "ex_crunches/0.jpg", image1: "ex_crunches/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hanging_raises: { image0: "ex_hanging_raises/0.jpg", image1: "ex_hanging_raises/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kabel_crossover: { image0: "ex_kabel_crossover/0.jpg", image1: "ex_kabel_crossover/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_pec_deck: { image0: "ex_pec_deck/0.jpg", image1: "ex_pec_deck/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_kabel: { image0: "ex_rudern_kabel/0.jpg", image1: "ex_rudern_kabel/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_latzug: { image0: "ex_latzug/0.jpg", image1: "ex_latzug/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_straight_arm_pulldown: { image0: "ex_straight_arm_pulldown/0.jpg", image1: "ex_straight_arm_pulldown/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_face_pulls: { image0: "ex_face_pulls/0.jpg", image1: "ex_face_pulls/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_brustgestuetzt: { image0: "ex_rudern_brustgestuetzt/0.jpg", image1: "ex_rudern_brustgestuetzt/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_rudern_tbar: { image0: "ex_rudern_tbar/0.jpg", image1: "ex_rudern_tbar/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_reverse_fly_maschine: { image0: "ex_reverse_fly_maschine/0.jpg", image1: "ex_reverse_fly_maschine/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinpresse: { image0: "ex_beinpresse/0.jpg", image1: "ex_beinpresse/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinstrecker: { image0: "ex_beinstrecker/0.jpg", image1: "ex_beinstrecker/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hack_squat: { image0: "ex_hack_squat/0.jpg", image1: "ex_hack_squat/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_beinbeuger_liegend: { image0: "ex_beinbeuger_liegend/0.jpg", image1: "ex_beinbeuger_liegend/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_hip_thrust_maschine: { image0: "ex_hip_thrust_maschine/0.jpg", image1: "ex_hip_thrust_maschine/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_wadenheben: { image0: "ex_wadenheben/0.jpg", image1: "ex_wadenheben/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_trizeps_seil: { image0: "ex_trizeps_seil/0.jpg", image1: "ex_trizeps_seil/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kabelcurl_ez: { image0: "ex_kabelcurl_ez/0.jpg", image1: "ex_kabelcurl_ez/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_bizepsmaschine: { image0: "ex_bizepsmaschine/0.jpg", image1: "ex_bizepsmaschine/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_kabel_crunch: { image0: "ex_kabel_crunch/0.jpg", image1: "ex_kabel_crunch/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_pallof: { image0: "ex_pallof/0.jpg", image1: "ex_pallof/1.jpg", credit: "Free Exercise DB (Public Domain)" },
  ex_abduktoren: { image0: "ex_abduktoren/0.jpg", image1: "ex_abduktoren/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_adduktoren: { image0: "ex_adduktoren/0.jpg", image1: "ex_adduktoren/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_beinbeuger_sitzend: { image0: "ex_beinbeuger_sitzend/0.jpg", image1: "ex_beinbeuger_sitzend/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_brustpresse: { image0: "ex_brustpresse/0.jpg", image1: "ex_brustpresse/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_einarm_rudern: { image0: "ex_einarm_rudern/0.jpg", image1: "ex_einarm_rudern/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_kabel_seitheben: { image0: "ex_kabel_seitheben/0.jpg", image1: "ex_kabel_seitheben/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_latzug_eng: { image0: "ex_latzug_eng/0.jpg", image1: "ex_latzug_eng/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_rueckenstrecker: { image0: "ex_rueckenstrecker/0.jpg", image1: "ex_rueckenstrecker/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_schulterpresse_maschine: { image0: "ex_schulterpresse_maschine/0.jpg", image1: "ex_schulterpresse_maschine/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_seitheben_maschine: { image0: "ex_seitheben_maschine/0.jpg", image1: "ex_seitheben_maschine/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_trizeps_ueberkopf_seil: { image0: "ex_trizeps_ueberkopf_seil/0.jpg", image1: "ex_trizeps_ueberkopf_seil/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_trizepsmaschine: { image0: "ex_trizepsmaschine/0.jpg", image1: "ex_trizepsmaschine/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
  ex_wadenheben_sitzend: { image0: "ex_wadenheben_sitzend/0.jpg", image1: "ex_wadenheben_sitzend/1.jpg", credit: "Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)" },
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
