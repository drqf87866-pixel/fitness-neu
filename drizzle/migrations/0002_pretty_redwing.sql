-- Bestandsdaten: Pro Nutzer darf danach höchstens ein Training offen sein.
-- Ältere offene Trainings werden mit ihrem Startzeitpunkt abgeschlossen,
-- das jüngste bleibt offen. Ohne diesen Schritt scheitert der Unique-Index.
UPDATE `workout_logs` SET `completed_at` = `started_at`
WHERE `completed_at` IS NULL
  AND `id` <> (
    SELECT `o`.`id` FROM `workout_logs` AS `o`
    WHERE `o`.`user_id` = `workout_logs`.`user_id` AND `o`.`completed_at` IS NULL
    ORDER BY `o`.`started_at` DESC, `o`.`id` DESC
    LIMIT 1
  );--> statement-breakpoint
CREATE INDEX `plan_exercises_exercise_idx` ON `plan_exercises` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `rate_limits_expires_idx` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE INDEX `workout_logs_plan_idx` ON `workout_logs` (`plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_logs_one_open_idx` ON `workout_logs` (`user_id`) WHERE completed_at IS NULL;
