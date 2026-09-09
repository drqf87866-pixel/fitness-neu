# Feature-Ideen für Fitness Neu

Diese Liste sammelt sinnvolle nächste Funktionen für die App, basierend auf einer Analyse des aktuellen Stands (Stand: 2026-09). Fokus liegt auf **Trainings-Tiefe** und **Engagement & Motivation** — zwei Bereiche, in denen die App aktuell noch Lücken hat. Es ist eine Ideenliste, keine verbindliche Roadmap; nichts davon ist umgesetzt.

## Ist-Zustand (kurz)

Fitness Neu ist eine deutschsprachige, mobile-first PWA (React 19 + Vite, React Router 7, TanStack Query) mit Hono-API auf Cloudflare Workers, Cloudflare D1 (SQLite) über Drizzle ORM, optionaler KI-Plangenerierung via Gemini und einem Offline-Sync-Queue-Mechanismus (IndexedDB → Server). Vorhanden sind bereits: manuelle + KI-Plan-Erstellung, ein 58-Übungen-Katalog mit Bildern, ein "Live-Training"-Modus mit Rest-Timer und Set-Logging, Verlauf/Kalender sowie Analytics (Wochenvolumen pro Muskelgruppe, PRs via geschätztem 1RM).

Es fehlen aktuell: Supersätze, RPE/RIR-Logging, Warm-up-Kennzeichnung, Push-Benachrichtigungen, Streaks/Achievements und ein Körpergewicht-Verlauf (nur ein statischer Snapshot im Profil). Es gibt kein Test-/CI-Setup — `pnpm typecheck` ist das einzige QA-Gate.

---

## A) Trainings-Tiefe

| # | Feature | Kernidee | Aufwand | Nutzen |
|---|---------|----------|---------|--------|
| A1 | **Plattenrechner** | Aus Zielgewicht + Langhantelgewicht (Standard 20kg) berechnen, welche Scheiben pro Seite aufgelegt werden. Reiner Client-Utility, aufrufbar aus `SetRow` bei `equipment = "barbell"`. | Niedrig | Hoch (sofort spürbar, kein Backend nötig) |
| A2 | **RPE/RIR pro Satz** | Optionales Feld (1–10 oder "Reps in Reserve") beim Abhaken eines Satzes in `SetRow` (`src/client/components/set-row.tsx`). Neue Spalte `rpe` auf `set_logs` (`src/db/schema.ts`). Basis für spätere Auto-Progression (A6). | Mittel | Hoch (Trainingsqualität sichtbar machen) |
| A3 | **Warm-up-Sätze kennzeichnen** | Flag `isWarmup` auf `set_logs`; solche Sätze zählen nicht in Volumen-/PR-Berechnung (`estimated1rm`, Wochenvolumen in `src/worker/routes/analytics.ts` und `src/worker/lib/helpers.ts`). UI: Quick-Toggle in `SetRow`. | Niedrig–Mittel | Mittel (genauere Statistiken) |
| A4 | **Supersätze / Zirkel** | Übungen in einer Gruppe (`groupId` auf `plan_exercises`) direkt nacheinander ohne (volle) Pause ausführen. Plan-Builder (`create-plan.tsx`) gruppiert visuell, Live-Training (`workout.tsx`) führt durch die Gruppe, Rest-Timer (`rest-timer.tsx`) triggert erst nach der letzten Übung der Gruppe. | Mittel–Hoch | Hoch (deckt gängigen Trainingsstil ab, der komplett fehlt) |
| A5 | **Drag & Drop statt Pfeile** für Übungsreihenfolge im Plan-Builder | Bestehendes `order`-Feld nutzen, nur UX-Layer ändern (z.B. `@dnd-kit`). | Niedrig | Mittel (Mobile-UX-Politur) |
| A6 | **Automatischer Progressions-Vorschlag** | Baut auf dem bereits vorhandenen "letztes Mal"-Hinweis in `SetRow` auf: Server schlägt nächstes Gewicht/Wdh. anhand letzter Session (+ RPE aus A2) vor, statt nur anzuzeigen. Heuristik zuerst, KI-Route (`src/worker/routes/ai.ts`) später optional erweiterbar. | Mittel | Hoch (großer Mehrwert für "was mache ich heute") |

**Empfohlene Reihenfolge:** A1 (schneller Gewinn, kein Schema-Change) → A3 → A2 → A6 → A4/A5 je nach Bedarf.

---

## B) Engagement & Motivation

| # | Feature | Kernidee | Aufwand | Nutzen |
|---|---------|----------|---------|--------|
| B1 | **Wochenziele** | Nutzer setzt Zielanzahl Workouts/Woche (neues Feld auf `users`); Dashboard zeigt Fortschrittsring — die "Sessions diese Woche"-Abfrage existiert in `src/worker/routes/analytics.ts` bereits und muss nur um ein Ziel ergänzt werden. | Niedrig | Hoch (nutzt fast komplett bestehende Daten) |
| B2 | **Streaks & Achievements** | Wochen-Streak (aufeinanderfolgende Trainingswochen) aus `workout_logs.startedAt` berechnen (ähnliche Query wie bestehendes Wochenvolumen). Meilenstein-Badges (erstes PR, 10. Workout, 4-Wochen-Streak) — visuell analog zur bestehenden `PrBadge`-Komponente. Kleine neue Tabelle `achievements` optional, oder rein berechnet. | Niedrig–Mittel | Hoch (klassischer Retention-Hebel, Daten sind schon da) |
| B3 | **Trainings-Erinnerungen (Push)** | Größter Infra-Schritt: Web-Push-Abo speichern (`push_subscriptions`-Tabelle), VAPID-Keys, Service-Worker-Push-Handler (aktuell generiert `vite-plugin-pwa` den SW automatisch – für echten Push-Handler ggf. auf `injectManifest`-Strategie wechseln). Versand über den **bereits vorhandenen täglichen Cron** (`scheduled`-Handler in `src/worker/index.ts`, läuft schon 3 Uhr nachts) z.B. "seit 3 Tagen nicht trainiert" oder an geplanten Trainingstagen. | Hoch | Hoch, aber teuerster Punkt der Liste |
| B4 | **Session-Teilen (leichtgewichtig)** | Nach Workout-Abschluss ein Zusammenfassungs-Bild/Text (Dauer, Volumen, erreichte PRs) über die Web Share API teilbar machen — ohne die fehlende Multi-User-/Social-Infrastruktur nachzubauen. | Niedrig | Mittel (Motivation ohne großen Scope) |
| B5 | **Kalender-Export (.ics)** | Geplante Trainingstage aus einem Plan als `.ics` exportieren (Client-seitig generierbar, kein Backend nötig). | Niedrig | Mittel |

**Empfohlene Reihenfolge:** B1 → B2 (beide fast ohne neue Infrastruktur) → B4/B5 → B3 (größter Aufwand, aber Cron-Grundlage existiert schon).

---

## Kurz erwähnt, nicht vertieft

Nicht im gewählten Fokus, aber auffällig günstig umzusetzen, falls später relevant:

- **Körpergewicht-Verlauf mit Chart**: `weightKg` ist aktuell nur ein einzelner Snapshot im Profil. Eine simple `body_weight_logs`-Tabelle + Wiederverwendung der bestehenden `VolumeChart`-Komponente wäre ein sehr kleiner Aufwand mit sichtbarem Nutzen.
- **1RM-Trend über Zeit**: Aktuell nur der aktuelle PR sichtbar, kein Verlauf — gleiche Chart-Infrastruktur wie oben nutzbar.
- **Ernährungs-/Kalorien-Tracking**: `calorieTarget` existiert im Profil, wird aber nirgends mit echtem Tracking verknüpft. Das wäre ein komplett neuer Funktionsbereich (Food-Log, evtl. Nährwert-Datenbank) — deutlich größerer Scope, hier bewusst nicht vertieft.

---

## Nächster Schritt

Für die Umsetzung einzelner Punkte (z.B. A1 + B1 als erster, kleiner Slice) empfiehlt sich ein neuer, fokussierter Plan mit konkreten Schema-/Route-/Komponenten-Änderungen.
