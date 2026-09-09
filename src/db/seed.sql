-- Katalog aufräumen: Übungen, die nicht mehr im Seed sind und nirgends
-- referenziert werden, entfernen. Custom-Übungen sowie alle in Plänen oder
-- Trainings-Logs genutzten Übungen bleiben erhalten (FK-sicher).
DELETE FROM exercises
WHERE is_custom = 0
  AND id NOT IN (SELECT exercise_id FROM plan_exercises)
  AND id NOT IN (SELECT exercise_id FROM set_logs);

INSERT OR IGNORE INTO exercises (id, name, category, primary_muscle, secondary_muscles, equipment, is_custom, user_id) VALUES
  -- === FREIHANTEL & KÖRPERGEWICHT ===
  ('ex_bankdruecken', 'Bankdrücken', 'push', 'chest', '["triceps","shoulders"]', 'barbell', 0, NULL),
  ('ex_schraegbank', 'Schrägbankdrücken', 'push', 'chest', '["shoulders","triceps"]', 'barbell', 0, NULL),
  ('ex_fliegende', 'Fliegende', 'push', 'chest', '[]', 'dumbbell', 0, NULL),
  ('ex_dips', 'Dips', 'push', 'chest', '["triceps","shoulders"]', 'bodyweight', 0, NULL),
  ('ex_liegestuetze', 'Liegestütze', 'push', 'chest', '["triceps","shoulders"]', 'bodyweight', 0, NULL),
  ('ex_close_grip_bench', 'Enges Bankdrücken', 'push', 'triceps', '["chest"]', 'barbell', 0, NULL),
  ('ex_schulterdruecken', 'Schulterdrücken', 'push', 'shoulders', '["triceps"]', 'dumbbell', 0, NULL),
  ('ex_military_press', 'Military Press', 'push', 'shoulders', '["triceps"]', 'barbell', 0, NULL),
  ('ex_seitheben', 'Seitheben', 'push', 'shoulders', '[]', 'dumbbell', 0, NULL),
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
  ('ex_goblet', 'Goblet Squat', 'legs', 'quads', '["glutes"]', 'dumbbell', 0, NULL),
  ('ex_ausfallschritte', 'Ausfallschritte', 'legs', 'quads', '["glutes","hamstrings"]', 'dumbbell', 0, NULL),
  ('ex_bulgarisch', 'Bulgarische Kniebeuge', 'legs', 'quads', '["glutes"]', 'dumbbell', 0, NULL),
  ('ex_hip_thrust', 'Hip Thrust', 'legs', 'glutes', '["hamstrings"]', 'barbell', 0, NULL),
  ('ex_plank', 'Plank', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_crunches', 'Crunches', 'core', 'core', '[]', 'bodyweight', 0, NULL),
  ('ex_hanging_raises', 'Hanging Leg Raises', 'core', 'core', '[]', 'bodyweight', 0, NULL),

  -- === MASCHINEN ===
  ('ex_brustpresse', 'Brustpresse', 'push', 'chest', '["triceps","shoulders"]', 'machine', 0, NULL),
  ('ex_pec_deck', 'Butterfly / Pec Deck', 'push', 'chest', '[]', 'machine', 0, NULL),
  ('ex_schulterpresse_maschine', 'Schulterpresse Maschine', 'push', 'shoulders', '["triceps"]', 'machine', 0, NULL),
  ('ex_seitheben_maschine', 'Seitheben-Maschine', 'push', 'shoulders', '[]', 'machine', 0, NULL),
  ('ex_reverse_fly_maschine', 'Reverse Fly Maschine', 'pull', 'shoulders', '["upper_back"]', 'machine', 0, NULL),
  ('ex_rudern_brustgestuetzt', 'Brustgestütztes Rudern', 'pull', 'upper_back', '["lats","biceps"]', 'machine', 0, NULL),
  ('ex_rudern_tbar', 'T-Bar Rudermaschine', 'pull', 'upper_back', '["lats","biceps"]', 'machine', 0, NULL),
  ('ex_rueckenstrecker', 'Rückenstrecker-Maschine', 'core', 'lower_back', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinpresse', 'Beinpresse 45 Grad', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_hack_squat', 'Hack-Squat Maschine', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_beinstrecker', 'Beinstrecker', 'legs', 'quads', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger_sitzend', 'Beinbeuger sitzend', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),
  ('ex_beinbeuger_liegend', 'Beinbeuger liegend', 'legs', 'hamstrings', '[]', 'machine', 0, NULL),
  ('ex_hip_thrust_maschine', 'Hip-Thrust-Maschine', 'legs', 'glutes', '["hamstrings"]', 'machine', 0, NULL),
  ('ex_abduktoren', 'Abduktorenmaschine', 'legs', 'glutes', '[]', 'machine', 0, NULL),
  ('ex_adduktoren', 'Adduktorenmaschine', 'legs', 'quads', '["glutes"]', 'machine', 0, NULL),
  ('ex_wadenheben', 'Wadenheben', 'legs', 'calves', '[]', 'machine', 0, NULL),
  ('ex_wadenheben_sitzend', 'Wadenheben sitzend', 'legs', 'calves', '[]', 'machine', 0, NULL),
  ('ex_trizepsmaschine', 'Trizepsmaschine', 'push', 'triceps', '[]', 'machine', 0, NULL),
  ('ex_bizepsmaschine', 'Bizepsmaschine', 'pull', 'biceps', '[]', 'machine', 0, NULL),

  -- === KABELZUG ===
  ('ex_kabel_crossover', 'Kabel-Crossover', 'push', 'chest', '["shoulders"]', 'cable', 0, NULL),
  ('ex_latzug', 'Latzug breit', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_latzug_eng', 'Latzug eng', 'pull', 'lats', '["biceps"]', 'cable', 0, NULL),
  ('ex_rudern_kabel', 'Rudern am Kabel sitzend', 'pull', 'upper_back', '["lats","biceps"]', 'cable', 0, NULL),
  ('ex_straight_arm_pulldown', 'Straight-Arm Pulldown', 'pull', 'lats', '[]', 'cable', 0, NULL),
  ('ex_face_pulls', 'Face Pulls', 'pull', 'shoulders', '["upper_back"]', 'cable', 0, NULL),
  ('ex_kabel_seitheben', 'Kabel-Seitheben', 'push', 'shoulders', '[]', 'cable', 0, NULL),
  ('ex_trizeps_seil', 'Trizepsdrücken Seil', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_trizeps_ueberkopf_seil', 'Überkopf-Trizepsstrecken Seil', 'push', 'triceps', '[]', 'cable', 0, NULL),
  ('ex_kabelcurl_ez', 'Kabelcurl EZ-Stange', 'pull', 'biceps', '[]', 'cable', 0, NULL),
  ('ex_kabel_crunch', 'Kabel-Crunch', 'core', 'core', '[]', 'cable', 0, NULL),
  ('ex_pallof', 'Pallof Press', 'core', 'core', '[]', 'cable', 0, NULL);
