INSERT OR IGNORE INTO exercises (id, name, category, primary_muscle, secondary_muscles, equipment, is_custom, user_id) VALUES
  -- === FREIHANTEL / BODYWEIGHT (bestehend) ===
  ('ex_bankdruecken', 'Bankdrücken', 'push', 'chest', '["triceps","shoulders"]', 'barbell', 0, NULL),
  ('ex_schraegbank', 'Schrägbankdrücken', 'push', 'chest', '["shoulders","triceps"]', 'barbell', 0, NULL),
  ('ex_fliegende', 'Fliegende', 'push', 'chest', '[]', 'dumbbell', 0, NULL),
  ('ex_dips', 'Dips', 'push', 'chest', '["triceps","shoulders"]', 'bodyweight', 0, NULL),
  ('ex_liegestuetze', 'Liegestütze', 'push', 'chest', '["triceps","shoulders"]', 'bodyweight', 0, NULL),
  ('ex_schulterdruecken', 'Schulterdrücken', 'push', 'shoulders', '["triceps"]', 'dumbbell', 0, NULL),
  ('ex_military_press', 'Military Press', 'push', 'shoulders', '["triceps"]', 'barbell', 0, NULL),
  ('ex_seitheben', 'Seitheben', 'push', 'shoulders', '[]', 'dumbbell', 0, NULL),
  ('ex_frontheben', 'Frontheben', 'push', 'shoulders', '[]', 'dumbbell', 0, NULL),
  ('ex_overhead_triceps', 'Überkopf-Trizepsstrecken', 'push', 'triceps', '[]', 'dumbbell', 0, NULL),
  ('ex_close_grip_bench', 'Enges Bankdrücken', 'push', 'triceps', '["chest"]', 'barbell', 0, NULL),
  ('ex_klimmzuege', 'Klimmzüge', 'pull', 'lats', '["biceps","upper_back"]', 'bodyweight', 0, NULL),
  ('ex_rudern_lh', 'Rudern Langhantel', 'pull', 'upper_back', '["lats","biceps"]', 'barbell', 0, NULL),
  ('ex_einarm_rudern', 'Einarmiges Kurzhantelrudern', 'pull', 'lats', '["upper_back","biceps"]', 'dumbbell', 0, NULL),
  ('ex_kreuzheben', 'Kreuzheben', 'pull', 'hamstrings', '["glutes","lower_back"]', 'barbell', 0, NULL),
  ('ex_rdl', 'Rumänisches Kreuzheben', 'legs', 'hamstrings', '["glutes","lower_back"]', 'barbell', 0, NULL),
  ('ex_shrugs', 'Shrugs', 'pull', 'traps', '[]', 'dumbbell', 0, NULL),
  ('ex_bizepscurls', 'Bizepscurls', 'pull', 'biceps', '[]', 'dumbbell', 0, NULL),
  ('ex_hammer_curls', 'Hammer Curls', 'pull', 'biceps', '["forearms"]', 'dumbbell', 0, NULL),
  ('ex_sz_curls', 'SZ-Curls', 'pull', 'biceps', '[]', 'barbell', 0, NULL),
  ('ex_kniebeugen', 'Kniebeugen', 'legs', 'quads', '["glutes","hamstrings"]', 'barbell', 0, NULL),
  ('ex_frontkniebeugen', 'Frontkniebeugen', 'legs', 'quads', '["glutes"]', 'barbell', 0, NULL),
  ('ex_goblet', 'Goblet Squat', 'legs', 'quads', '["glutes"]', 'dumbbell', 0, NULL),
  ('ex_ausfallschritte', 'Ausfallschritte', 'legs', 'quads', '["glutes","hamstrings"]', 'dumbbell', 0, NULL),
  ('ex_bulgarisch', 'Bulgarische Kniebeuge', 'legs', 'quads', '["glutes"]', 'dumbbell', 0, NULL),
  ('ex_hip_thrust', 'Hip Thrust', 'legs', 'glutes', '["hamstrings"]', 'barbell', 0, NULL),
  ('ex_plank', 'Plank', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_crunches', 'Crunches', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_hanging_raises', 'Hanging Leg Raises', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_russian_twist', 'Russian Twists', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_ab_wheel', 'Ab Rollout', 'core', 'core', '[]', 'other', 0, NULL),
  ('ex_seilspringen', 'Seilspringen', 'cardio', 'cardio', '["calves"]', 'other', 0, NULL),

  -- === KABELZÜGE: BRUST ===
  ('ex_kabelueberzuege', 'Kabelüberzüge', 'push', 'chest', '[]', 'cable', 0, NULL),
  ('ex_kabel_fliegend_hoch', 'Kabel-Flys Überkopf', 'push', 'chest', '["shoulders"]', 'cable', 0, NULL),
  ('ex_kabel_fliegend_mittel', 'Kabel-Flys mittig', 'push', 'chest', '[]', 'cable', 0, NULL),
  ('ex_kabel_fliegend_tief', 'Kabel-Flys von unten', 'push', 'chest', '["shoulders"]', 'cable', 0, NULL),
  ('ex_kabel_crossover', 'Kabel-Crossover', 'push', 'chest', '["shoulders"]', 'cable', 0, NULL),
  ('ex_kabel_fliegend_einarmig', 'Einarmiges Kabel-Flys', 'push', 'chest', '[]', 'cable', 0, NULL),
  ('ex_kabel_brustpresse', 'Kabel-Brustpresse', 'push', 'chest', '["triceps","shoulders"]', 'cable', 0, NULL),
  ('ex_kabel_fliegend_schraeg', 'Kabel-Flys schräg', 'push', 'chest', '["shoulders"]', 'cable', 0, NULL),

  -- === MASCHINEN: BRUST ===
  ('ex_brustpresse', 'Brustpresse', 'push', 'chest', '["triceps","shoulders"]', 'machine', 0, NULL),
  ('ex_brustpresse_schraeg', 'Schrägbank-Brustpresse', 'push', 'chest', '["shoulders","triceps"]', 'machine', 0, NULL),
  ('ex_brustpresse_konvergent', 'Konvergente Brustpresse', 'push', 'chest', '["triceps","shoulders"]', 'machine', 0, NULL),
  ('ex_pec_deck', 'Butterfly / Pec Deck', 'push', 'chest', '[]', 'machine', 0, NULL),
  ('ex_pec_deck_reverse', 'Reverse Pec Deck', 'pull', 'shoulders', '["upper_back"]', 'machine', 0, NULL),

  -- === KABELZÜGE: RÜCKEN ===
  ('ex_rudern_kabel', 'Rudern am Kabel sitzend', 'pull', 'upper_back', '["lats","biceps"]', 'cable', 0, NULL),
  ('ex_latzug', 'Latzug breit', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_latzug_eng', 'Latzug eng', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_latzug_neutral', 'Latzug neutral', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_latzug_supiniert', 'Latzug supiniert', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_latzug_einarmig', 'Einarmiger Latzug', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_rudern_kabel_eng', 'Kabelrudern eng', 'pull', 'upper_back', '["lats","biceps"]', 'cable', 0, NULL),
  ('ex_rudern_kabel_breit', 'Kabelrudern breit', 'pull', 'upper_back', '["lats","biceps"]', 'cable', 0, NULL),
  ('ex_rudern_kabel_neutral', 'Kabelrudern neutral', 'pull', 'upper_back', '["lats","biceps"]', 'cable', 0, NULL),
  ('ex_rudern_kabel_einarmig', 'Einarmiges Kabelrudern', 'pull', 'lats', '["upper_back","biceps"]', 'cable', 0, NULL),
  ('ex_straight_arm_pulldown', 'Straight-Arm Pulldown', 'pull', 'lats', '[]', 'cable', 0, NULL),
  ('ex_kabel_pullover', 'Kabel-Pullover', 'pull', 'lats', '["chest"]', 'cable', 0, NULL),
  ('ex_face_pulls', 'Face Pulls', 'pull', 'shoulders', '["upper_back"]', 'cable', 0, NULL),
  ('ex_face_pulls_einarmig', 'Einarmige Face Pulls', 'pull', 'shoulders', '["upper_back"]', 'cable', 0, NULL),
  ('ex_kabel_shrugs', 'Kabel-Shrugs', 'pull', 'traps', '[]', 'cable', 0, NULL),

  -- === MASCHINEN: RÜCKEN ===
  ('ex_rudern_maschine', 'Rudermaschine', 'pull', 'upper_back', '["lats","biceps"]', 'machine', 0, NULL),
  ('ex_rudern_maschine_einarmig', 'Einarmige Rudermaschine', 'pull', 'lats', '["upper_back","biceps"]', 'machine', 0, NULL),
  ('ex_rudern_brustgestuetzt', 'Brustgestütztes Rudern', 'pull', 'upper_back', '["lats","biceps"]', 'machine', 0, NULL),
  ('ex_rudern_tbar', 'T-Bar Rudermaschine', 'pull', 'upper_back', '["lats","biceps"]', 'machine', 0, NULL),
  ('ex_high_row', 'High Row Maschine', 'pull', 'upper_back', '["lats"]', 'machine', 0, NULL),
  ('ex_low_row', 'Low Row Maschine', 'pull', 'lats', '["upper_back","biceps"]', 'machine', 0, NULL),
  ('ex_latzug_maschine', 'Latzug-Maschine', 'pull', 'lats', '["biceps"]', 'machine', 0, NULL),

  -- === KABELZÜGE: SCHULTERN ===
  ('ex_face_pulls_seil', 'Face Pulls Seil', 'pull', 'shoulders', '["upper_back"]', 'cable', 0, NULL),
  ('ex_kabel_seitheben', 'Kabel-Seitheben', 'push', 'shoulders', '[]', 'cable', 0, NULL),
  ('ex_kabel_seitheben_einarmig', 'Einarmiges Kabel-Seitheben', 'push', 'shoulders', '[]', 'cable', 0, NULL),
  ('ex_kabel_seitheben_hinten', 'Kabel-Seitheben hinter dem Körper', 'push', 'shoulders', '[]', 'cable', 0, NULL),
  ('ex_kabel_frontheben', 'Kabel-Frontheben', 'push', 'shoulders', '[]', 'cable', 0, NULL),
  ('ex_kabel_reverse_fly', 'Kabel-Reverse Fly', 'pull', 'shoulders', '["upper_back"]', 'cable', 0, NULL),
  ('ex_kabel_y_raise', 'Kabel Y-Raise', 'push', 'shoulders', '["traps"]', 'cable', 0, NULL),
  ('ex_kabel_upright_row', 'Kabel-Upright Row', 'pull', 'shoulders', '["biceps"]', 'cable', 0, NULL),
  ('ex_trizepsdruecken', 'Trizepsdrücken am Kabel', 'push', 'triceps', '[]', 'cable', 0, NULL),

  -- === MASCHINEN: SCHULTERN ===
  ('ex_schulterpresse_maschine', 'Schulterpresse Maschine', 'push', 'shoulders', '["triceps"]', 'machine', 0, NULL),
  ('ex_schulterpresse_konvergent', 'Konvergente Schulterpresse', 'push', 'shoulders', '["triceps"]', 'machine', 0, NULL),
  ('ex_seitheben_maschine', 'Seitheben-Maschine', 'push', 'shoulders', '[]', 'machine', 0, NULL),
  ('ex_reverse_fly_maschine', 'Reverse Fly Maschine', 'pull', 'shoulders', '["upper_back"]', 'machine', 0, NULL),

  -- === MASCHINEN: QUADRIZEPS ===
  ('ex_beinpresse', 'Beinpresse 45 Grad', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinpresse_horizontal', 'Beinpresse horizontal', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinpresse_vertikal', 'Beinpresse vertikal', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinpresse_einbein', 'Einbein-Beinpresse', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinstrecker', 'Beinstrecker', 'legs', 'quads', '[]', 'machine', 0, NULL),
  ('ex_beinstrecker_einbein', 'Einbein-Beinstrecker', 'legs', 'quads', '[]', 'machine', 0, NULL),
  ('ex_hack_squat', 'Hack-Squat Maschine', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_pendulum_squat', 'Pendulum Squat', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_belt_squat', 'Belt Squat', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_smith_kniebeuge', 'Smith-Machine Kniebeuge', 'legs', 'quads', '["glutes","hamstrings"]', 'machine', 0, NULL),
  ('ex_sissy_squat_maschine', 'Sissy-Squat-Maschine', 'legs', 'quads', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger', 'Beinbeuger', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),

  -- === MASCHINEN: HAMSTRINGS ===
  ('ex_beinbeuger_liegend', 'Beinbeuger liegend', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger_sitzend', 'Beinbeuger sitzend', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger_stehend', 'Beinbeuger stehend', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger_einbein', 'Einbein-Beinbeuger', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),

  -- === MASCHINEN / KABEL: GESÄSS ===
  ('ex_glute_drive', 'Glute Drive', 'legs', 'glutes', '["hamstrings"]', 'machine', 0, NULL),
  ('ex_hip_thrust_maschine', 'Hip-Thrust-Maschine', 'legs', 'glutes', '["hamstrings"]', 'machine', 0, NULL),
  ('ex_kickback_maschine', 'Kickback-Maschine', 'legs', 'glutes', '[]', 'machine', 0, NULL),
  ('ex_abduktoren', 'Abduktorenmaschine', 'legs', 'glutes', '[]', 'machine', 0, NULL),
  ('ex_adduktoren', 'Adduktorenmaschine', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_kabel_kickback', 'Kabel-Kickback', 'legs', 'glutes', '[]', 'cable', 0, NULL),
  ('ex_kabel_pullthrough', 'Kabel-Pull-Through', 'legs', 'glutes', '["hamstrings"]', 'cable', 0, NULL),
  ('ex_kabel_good_morning', 'Kabel-Good-Morning', 'legs', 'hamstrings', '["glutes","lower_back"]', 'cable', 0, NULL),

  -- === WADEN ===
  ('ex_wadenheben', 'Wadenheben', 'legs', 'calves', '[]', 'machine', 0, NULL),
  ('ex_wadenheben_sitzend', 'Wadenheben sitzend', 'legs', 'calves', '[]', 'machine', 0, NULL),
  ('ex_wadenheben_beinpresse', 'Wadenheben an Beinpresse', 'legs', 'calves', '[]', 'machine', 0, NULL),
  ('ex_wadenheben_einbein', 'Einbein-Wadenheben', 'legs', 'calves', '[]', 'machine', 0, NULL),

  -- === KABELZÜGE: TRIZEPS ===
  ('ex_trizeps_seil', 'Trizepsdrücken Seil', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_stange', 'Trizepsdrücken Stange', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_einhand', 'Einhand-Trizepsdrücken', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_ueberkopf_seil', 'Überkopf-Trizepsstrecken Seil', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_kickback_kabel', 'Kabel-Kickback Trizeps', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_pushdown_einarmig', 'Einarmiges Trizepsdrücken', 'push', 'triceps', '[]', 'cable', 0, NULL),

  -- === MASCHINEN: TRIZEPS ===
  ('ex_trizepsmaschine', 'Trizepsmaschine', 'push', 'triceps', '[]', 'machine', 0, NULL),

  -- === KABELZÜGE: BIZEPS ===
  ('ex_kabelcurl_stange', 'Kabelcurl geradstange', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabelcurl_ez', 'Kabelcurl EZ-Stange', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabelcurl_seil', 'Kabelcurl Seil', 'pull', 'biceps', '["forearms"]', 'cable', 0, NULL),
  ('ex_kabelcurl_tief', 'Kabelcurl von unten', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabelcurl_hoch', 'Kabelcurl Überkopf', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabelcurl_einarmig', 'Einarmiger Kabelcurl', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_bayesian_curl', 'Bayesian Cable Curl', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabel_crossbody_curl', 'Kabel Cross-Body Curl', 'pull', 'biceps', '[]', 'cable', 0, NULL),

  -- === MASCHINEN: BIZEPS ===
  ('ex_bizepsmaschine', 'Bizepsmaschine', 'pull', 'biceps', '[]', 'machine', 0, NULL),
  ('ex_preacher_curl_maschine', 'Preacher-Curl-Maschine', 'pull', 'biceps', '[]', 'machine', 0, NULL),

  -- === KABELZÜGE: CORE ===
  ('ex_kabel_crunch', 'Kabel-Crunch', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_kabel_rotation', 'Kabelrotation stehend', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_kabel_rotation_kniend', 'Kabelrotation kniend', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_woodchopper_oben', 'Woodchopper oben-unten', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_woodchopper_unten', 'Woodchopper unten-oben', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_pallof_kniend', 'Pallof Press kniend', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_kabel_seitcrunch', 'Seitlicher Kabel-Crunch', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_kabel_hueftheben', 'Kabel-Hüftheben', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_pallof', 'Pallof Press', 'core', 'core', '[]', 'cable', 0, NULL),

  -- === MASCHINEN: CORE ===
  ('ex_crunch_maschine', 'Crunch-Maschine', 'core', 'core', '[]', 'machine', 0, NULL),
  ('ex_rueckenstrecker', 'Rückenstrecker-Maschine', 'core', 'lower_back', '["glutes"]', 'machine', 0, NULL),

  -- === CARDIO GERÄTE ===
  ('ex_laufband', 'Laufband', 'cardio', 'cardio', '[]', 'machine', 0, NULL),
  ('ex_rudern_cardio', 'Ruderergometer', 'cardio', 'cardio', '["lats","quads"]', 'machine', 0, NULL),
  ('ex_fahrrad', 'Fahrrad-Ergometer', 'cardio', 'cardio', '["quads"]', 'machine', 0, NULL),
  ('ex_stairmaster', 'Stairmaster', 'cardio', 'cardio', '["glutes","calves"]', 'machine', 0, NULL),
  ('ex_ellips_trainer', 'Ellipsentrainer', 'cardio', 'cardio', '["quads","glutes"]', 'machine', 0, NULL),
  ('ex_airbike', 'Air Bike', 'cardio', 'cardio', '["quads","shoulders"]', 'machine', 0, NULL),
  ('ex_ski_erg', 'SkiErg', 'cardio', 'cardio', '["lats","core"]', 'machine', 0, NULL),
  ('ex_assault_bike', 'Assault Bike', 'cardio', 'cardio', '["quads","shoulders"]', 'machine', 0, NULL);
