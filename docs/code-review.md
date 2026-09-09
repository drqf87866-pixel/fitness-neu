# Code Review — fitness-neu

**Datum:** 2026-09-09
**Scope:** Vollständiges Projekt (Backend, Frontend, Konfiguration, PWA, DB-Migrationen)

---

## Gesamtbild

Solide, durchdachte Codebasis. Passwort-Hashing, Session-Handling, IDOR-Schutz, Input-Validierung und Offline-Architektur sind überdurchschnittlich gut. Es gibt jedoch **2 kritische Datenverlust-Bugs**, mehrere hochpriore Funktions-/Sicherheits-Bugs und diverse mittlere/niedrige Findings.

---

## Kritisch (Datenverlust)

### K1 — Offline-Beenden löscht lokale Session ohne gesicherten Queue-Stand
**Datei:** `src/client/hooks/use-active-workout.ts:280-303`

Wenn ein Workout komplett offline durchgeführt wird und der Nutzer „Beenden" drückt, wird die lokale IndexedDB-Kopie gelöscht, bevor ein vollständiger `PUT /sets` in der Sync-Queue liegt. Der gequeuete PATCH allein enthält keine Sätze. Wird die App vor dem Sync geschlossen → **alle Sätze unwiederbringlich verloren**.

**Fix:** Vor `clearLocalSession` im Offline-Pfad explizit ein `PUT /sets` in die Queue legen (zusätzlich zum PATCH), oder die dirty Session erst nach erfolgreichem Flush löschen.

### K2 — 404 auf `PUT /sets` verwirft ein ganzes Training
**Datei:** `src/client/lib/sync.ts:19-25, 129-134`

`isPermanentFailure` behandelt 404 als permanent. Wenn die Server-Session zwischenzeitlich gelöscht wurde (anderes Gerät), wird beim Sync die lokale Session gelöscht und nur ein Toast gezeigt.

**Fix:** Bei 404 auf `PUT /sets` die lokale Session **nicht** löschen, sondern als Waise in der Dead-Letter-Liste behalten mit Wiederherstellungs-Option (z. B. „Als abgeschlossenes Training nachtragen").

---

## Hoch (Sicherheit + Funktion)

### H1 — Plan-Löschung schlägt fehl, sobald der Plan trainiert wurde (FK-Constraint → 500)
**Dateien:** `src/worker/routes/plans.ts:129-139` vs. `src/db/schema.ts:91`

`workout_logs.plan_id` hat `ON DELETE no action`. D1 erzwingt FKs → `DELETE /api/plans/:id` wirft 500, sobald auch nur eine Session mit diesem Plan existiert. Der Plan ist für den User **unlöschbar**.

**Fix:** Vor dem Delete `UPDATE workout_logs SET plan_id = NULL WHERE plan_id = ?` im selben Batch, oder Schema ändern auf `onDelete: "set null"` + Migration.

### H2 — Custom-Übung löschen schlägt fehl, wenn referenziert (FK-Constraint → 500)
**Datei:** `src/worker/routes/exercises.ts:70-79`

Gleiches Muster: `plan_exercises.exercise_id` und `set_logs.exercise_id` haben `ON DELETE no action`. Delete auf verwendete Übung → 500 statt verständlicher Fehlermeldung.

**Fix:** Vorher Referenz-Count prüfen, bei > 0 → 409 mit deutscher Meldung („Übung wird noch verwendet") oder Soft-Delete.

### H3 — Passwortänderung invalidiert bestehende Sessions nicht
**Datei:** `src/worker/routes/profile.ts:40-56`

Nach Passwortwechsel bleiben alle Session-Tokens (30 Tage TTL) gültig. Bei Session-Diebstahl kann das Opfer den Angreifer nicht aussperren.

**Fix:** Nach Passwort-Update alle Sessions des Users löschen (außer ggf. der aktuellen → neue Session setzen).

### H4 — Service-Worker cacht user-spezifische Daten; Logout leert Cache nicht
**Dateien:** `vite.config.ts:58-76`, `src/worker/routes/exercises.ts:11-19`, `src/client/lib/auth.ts:33-41`

`GET /api/exercises` liefert Katalog **plus** Custom-Übungen des eingeloggten Users. Der SW speichert diese Antwort 1h im `exercises-cache`. Bei Logout→Login anderer User auf demselben Gerät: User B sieht User A's Custom-Übungen (Privacy-Leak). Nirgendwo gibt es `caches.delete("exercises-cache")`.

**Fix:** Beim Logout den SW-Cache leeren, oder nur den Katalog-Teil cachen und Custom-Übungen separat laden.

### H5 — Gewicht wird in lbs eingegeben, aber als kg gespeichert
**Datei:** `src/client/pages/profile.tsx:144-155`

Das Label wechselt auf „lbs", aber der Wert wird unumgerechnet als `weightKg` an die API gesendet. 180 lbs → 180 kg in der DB (Faktor 2,2 Fehler).

**Fix:** `displayToKg()` beim Speichern anwenden und `kgToDisplay()` beim Anzeigen.

### H6 — Letzte Änderung geht verloren, wenn Nutzer schnell navigiert
**Datei:** `src/client/hooks/use-active-workout.ts:46-50`

Debounced Persist (400 ms) wird bei Unmount nur gecleart, nicht geflusht. Änderung + schnelles Wegtippen → Änderung weg.

**Fix:** Im Cleanup `void persist(...)` fire-and-forget aufrufen statt nur `clearTimeout`.

### H7 — PATCH complete kann PUT überholen → verworfene Sätze
**Datei:** `src/client/lib/sync.ts:106-119, 142`

Wenn ein PUT (Session A) transient fehlschlägt, `break`t die Schleife — aber die Rest-Schleife läuft weiter und kann ein PATCH complete derselben Session ausführen. Nachfolgender PUT-Retry scheitert dann mit 409 → **K1-Datenverlust**.

**Fix:** Nach `break` in der PUT-Schleife auch die Rest-Schleife überspringen (`return` statt `break`).

### H8 — Rate-Limiting hat Race Condition (nicht atomar)
**Datei:** `src/worker/lib/rate-limit.ts:13-37`

SELECT → UPDATE in zwei Statements. Parallele Requests lesen beide `count < limit` → beide durchgelassen. Brute-Force-Schutz systematisch schwächer als konfiguriert.

**Fix:** Atomaren Upsert (`INSERT ... ON CONFLICT ... DO UPDATE`) verwenden.

### H9 — Sheet-Stack in StrictMode doppelt gepusht
**Datei:** `src/client/components/ui/sheet.tsx:36-40, 144-181`

React 19 StrictMode mountet Effects doppelt. `sheetStack.push(close)` läuft zweimal, Cleanup entfernt nur einmal → Stack-Leiche → History-Management out-of-sync.

**Fix:** Deduplizieren via `if (!sheetStack.includes(close)) sheetStack.push(close)`.

### H10 — AudioContext-Leak im RestTimer
**Datei:** `src/client/components/rest-timer.tsx:15-32`

Jeder Beep erzeugt einen neuen `AudioContext`. Nach 6 Pausen ohne sauberes `onended` ist Audio komplett tot (Chrome-Limit).

**Fix:** Einen einzigen `AudioContext` im Modul-Scope lazy erzeugen und wiederverwenden.

---

## Mittel

| # | Bereich | Problem | Fix |
|---|---------|---------|-----|
| M1 | `analytics.ts:24-167` | Queries ohne LIMIT laden **jeden Satz** des Users in den Worker → D1 1-MB-Limit-Risiko | Aggregation in SQL verlagern (`MAX`, `GROUP BY`) |
| M2 | `analytics.ts:60-61` | Query-Parameter unvalidiert, `?from=0` = Full-Scan | Zod-Validierung + Fenster-Obergrenze |
| M3 | `sessions.ts:299-335` | Race: zwei offene Sessions möglich | Partieller Unique-Index `WHERE completed_at IS NULL` |
| M4 | `profile.ts:40-56` | Kein Rate-Limit auf Passwortänderung | `consumeRateLimit(db, "pwchange:" + userId, 5, 900)` |
| M5 | `password.ts:1` + `wrangler.jsonc` | PBKDF2 nur 100k Iterationen (OWASP: 600k); kein `cpu_ms`-Limit konfiguriert | Iterationen erhöhen + `"limits": { "cpu_ms": 500 }` |
| M6 | Kein `Cache-Control`-Header auf API-Responses | Browser darf heuristisch cachen (RFC 9111) → stale Auth/Profil | Middleware: `Cache-Control: no-store` auf `/api/*` |
| M7 | `sync.ts` | Dead-Letter-Liste wird nie angezeigt, Daten gehen unter | Dead-Letters im Profil anzeigen mit Lösch-Option |
| M8 | `ai.ts:18-22` | AI-Rate-Limits global — ein User kann KI für alle blockieren | Zusätzliches Per-User-Limit |
| M9 | `auth.ts` (Logout) | Query-Cache wird geleert, aber IndexedDB/Offline-Queue nicht → Cross-User-Daten | Auch IndexedDB/Queue beim Logout leeren |
| M10 | Precache zieht ~7 MB Übungsbilder | Verzögert SW-Installation auf Mobilfunk | Bilder aus Precache nehmen, per Runtime-Cache nachladen |
| M11 | `workout.tsx:53-56` | Notification-Permission sofort beim Betreten ohne Kontext | An User-Gesture koppeln |
| M12 | `use-active-workout.ts:70-99` | Race zwischen lokaler Kopie und Server-Antwort ohne Versionsabgleich | `mutatedSinceLoad`-Flag |
| M13 | `plans.ts:35-45` | N+1 bei `GET /api/plans` | Join + Gruppierung statt Loop |

---

## Niedrig

| # | Problem |
|---|---------|
| N1 | `GEMINI_API_KEY` in `env.d.ts` als Pflicht typisiert, ist aber optional |
| N2 | `@cloudflare/workers-types: "latest"` ungepinnt — einzige ungepinnte Dep |
| N3 | `.gitignore` fehlt `.env`/`.env.*` (Vite lädt `.env` automatisch) |
| N4 | `tsconfig.json` fehlt `"node"` in `types`, obwohl Node-APIs genutzt werden |
| N5 | Fehlende Indizes: `plan_exercises.exercise_id`, `workout_logs.plan_id`, `rate_limits.expires_at` |
| N6 | Plural-Bug: „3 Satz noch offen" statt „3 Sätze" (`workout.tsx:117`) |
| N7 | Magic Number `10` (Batch-Chunk) an 5 Stellen dupliziert |
| N8 | `plan-detail.tsx:97` sortiert den react-query-Cache in-place |
| N9 | `MOVEMENT_TAGS` und `CATEGORY_LABELS` sind identische Duplikate |
| N10 | Tote `aliasMap` in `exercise-images.ts` |
| N11 | User-Enumeration via Login-Timing (Dummy-Verify fehlt) |
| N12 | Register-Race: zwei parallele Registrierungen mit gleicher E-Mail → 500 statt 409 |
| N13 | Runtime-Cache-Name nicht versioniert (`exercises-cache` → `exercises-v1`) |
| N14 | Server sendet `ZodError` als JSON → Client-Toast zeigt generische Fehlermeldung |

---

## Positive Aspekte

- **Security-Grundlagen stark:** PBKDF2 mit Salt + Timing-Safe-Compare, Session-Tokens als SHA-256-Hash in DB, HttpOnly/SameSite=Lax/Secure Cookies, Zod überall, IDOR-Schutz konsistent
- **AI-Härtung:** Prompt-Injection-Mitigation, Timeout, Fallback ohne API-Key
- **Offline-Architektur:** Klare Trennung, Dead-Letter-Konzept, permanente vs. transiente Fehler differenziert
- **Sheet-Komponente:** Fokusfalle, Android-Back, Drag-to-Dismiss, `prefers-reduced-motion` — vorbildlich
- **PWA-Kernregel korrekt:** Auth/Session/Analytics network-only, SPA-Fallback funktioniert
- **Secrets:** Dreifach abgesichert (gitignore, Build-Plugin, .assetsignore)
- **Migrationen:** 1:1 konsistent mit Schema, FK-sicher, idempotent
- **TypeScript:** strict, keine `any`-Inflation, Path-Aliase konsistent

---

## Priorisierung

| Phase | Items | Aufwand |
|-------|-------|---------|
| **Sofort** | K1, K2 (Datenverlust), H1, H2 (500er in produktiven Features) | Klein — je ~10-30 Zeilen |
| **Kurzfristig** | H3+H4 (Security/Privacy), H5 (Datenkorruption), H7 (Sync-Bug) | Klein-Mittel |
| **Mittelfristig** | H6, H8, H9, H10, M1-M6 | Mittel |
| **Backlog** | Restliche Mittel + Niedrig | Klein |
