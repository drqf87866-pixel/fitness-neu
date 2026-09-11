# Code Review — fitness-neu

**Datum:** 2026-09-11 (Folge-Review zu 2026-09-09)
**Stand:** Commit `20570ab`
**Scope:** Vollständiges Projekt (Worker, Frontend, Konfiguration, PWA, DB-Migrationen). `pnpm typecheck` grün.

---

## Gesamtbild

Die Basis ist solide: Auth, IDOR-Schutz, Zod-Validierung und atomare Batches passen. Die größte Schwachstelle
bleibt der **Offline-/Sync-Pfad des Live-Trainings**: Dort gibt es mehrere voneinander unabhängige Wege, auf
denen gespeicherte Sätze verloren gehen. Die Ursache ist architektonisch: Drei Mechanismen konkurrieren
miteinander (Queue-PUT, Dirty-Flag in IndexedDB, direkter PUT), und es gibt keine Revisionsnummer.

---

## A. Status der Findings vom 09.09.

| # | Status | Anmerkung |
|---|---|---|
| K1, H1, H2 | ✅ behoben (`69affec`) | |
| K2 | ⚠️ teilweise | Die lokale Kopie bleibt erhalten, aber jeder Sync löst erneut Toast + Dead-Letter aus. Es gibt keine Auflösung (N-M5) |
| H3 Passwortwechsel invalidiert Sessions nicht | ❌ offen | `profile.ts` |
| H4 SW cacht Custom-Übungen, Logout leert nichts | ❌ offen | `vite.config.ts`, `auth.ts` |
| H5 lbs-Körpergewicht als kg gespeichert | ❌ offen | `profile.tsx` |
| H6 Debounce wird bei Unmount verworfen | ❌ offen | Das „X“ im Training verspricht „wird lokal gespeichert“ |
| H7 PATCH überholt fehlgeschlagenen PUT | ❌ offen → **kritisch** | Seit dem K1-Fix wird bei jedem Offline-Beenden PUT+PATCH gequeuet, der Pfad ist also häufig |
| H8 Rate-Limit nicht atomar | ❌ offen | |
| H9 Sheet-Stack StrictMode | ➖ nicht mehr zutreffend | Jeder Effect-Lauf hat eine eigene `close`-Closure, der Stack bleibt konsistent |
| H10 AudioContext | ⚠️ teilweise | `close()` ergänzt, der Kontext entsteht aber ohne User-Geste (auf iOS stumm, N-M3) |
| M1/M2 Analytics lädt alle Sätze, Query-Params unvalidiert | ❌ offen | Auch `GET /api/sessions` aggregiert über **alle** Sessions statt über die angezeigten |
| M3 mehrere offene Sessions möglich | ❌ offen | Wird durch N-M7 verschärft |
| M4 kein Rate-Limit auf Passwortwechsel | ❌ offen | |
| M5 PBKDF2 auf 600k | ➖ **Empfehlung falsch** | Workers-WebCrypto lehnt >100.000 Iterationen ab. 100k ist dort das Maximum |
| M6 kein `Cache-Control: no-store` | ❌ offen | |
| M7 Dead-Letters unsichtbar | ❌ offen | |
| M8 KI-Limit nur global | ❌ offen | Gilt auch für `/ai/alternatives` |
| M9 IndexedDB/Queue beim Logout nicht geleert | ❌ offen | Die Queue von User A läuft mit dem Cookie von User B → 404 → verworfen |
| M10 7,4 MB Übungsbilder im Precache | ❌ offen | |
| M11 Notification-Permission sofort beim Öffnen | ❌ offen | Auf Android zudem wirkungslos (N-M3) |
| M12 Race lokal ↔ Server beim Laden | ❌ offen | |
| M13 N+1 bei `GET /plans` | ❌ offen | |
| N1–N3, N5, N7–N13 | ❌ offen | N4 hinfällig: Node-Typen kommen transitiv über `vite` |
| N6 Plural „Satz“ | ❌ offen | Beide Ternary-Zweige sind leer |
| N14 ZodError-Objekt | ⚠️ teilweise | `parseJson` liefert einen String, die Zod-Standardtexte sind aber englisch |

---

## B. Neue Findings

### Kritisch (Datenverlust)

**N-K1: Online-Beenden mit fehlgeschlagenem PUT verliert alle Sätze.** `use-active-workout.ts` (`completeWorkout` + `persist`)
`persist()` fängt PUT-Fehler ab (5xx, Timeout, Funkloch trotz `navigator.onLine`) und queuet den PUT nur.
`completeWorkout` schickt danach trotzdem `PATCH completedAt` und löscht die lokale Kopie. Beim Flush kommt
vom Server 409 „bereits abgeschlossen“, der PUT wird verworfen und die Sätze sind weg.

**H7 (hochgestuft):** Transienter PUT-Fehler im Flush → `break` → die Rest-Schleife schickt trotzdem den PATCH derselben Session.

### Hoch

- **N-H1: Veraltete Queue-PUTs überschreiben neuere Serverstände.** Ein fehlgeschlagener PUT bleibt als Snapshot in der
  Queue, spätere erfolgreiche PUTs entfernen ihn nicht. Der nächste Flush spielt den alten Stand wieder ein.
- **N-H2: Online-Pfad markiert die lokale Kopie vor dem PUT als sauber.** Wird die App während des Requests beendet,
  gibt es weder Dirty-Flag noch Queue-Eintrag. Beim nächsten Laden gewinnt der Serverstand.
- **N-H3: Flush überschreibt neuere lokale Änderungen.** Der Flush schreibt seinen Snapshot als `dirty=false` zurück, auch
  wenn der Nutzer währenddessen weiter getippt hat. PUTs derselben Session können sich zudem überholen.
- **N-H4: Plan bearbeiten löscht Pausenzeiten und Startgewichte.** Der Editor kennt `restSeconds`/`suggestedWeight` nicht,
  beim PATCH setzt der Server deshalb 90 s und `null`.
- **N-H5: KI-Plan mit >12 Übungen führt zu 500.** Alle `plan_exercises` gehen als ein INSERT raus, D1 erlaubt maximal 100 Parameter.
- **N-H6: Verlauf zeigt nur die letzten 90 Trainings.** Ältere Monate erscheinen als „Keine Trainings in diesem Monat“.

### Mittel

| # | Problem |
|---|---|
| N-M1 | `/previous` nimmt nur die jüngste Session mit irgendeiner der Übungen, andere Übungen bekommen kein „zuletzt“. Dazu N+1 mit bis zu 20 Queries |
| N-M2 | Stepper: Long-Press nutzt eine veraltete Closure (gedrücktes +/− ändert nur einmal) und ist per Tastatur nicht bedienbar |
| N-M3 | Pausen-Timer: `new Notification()` wirft auf Android (dort ist `showNotification` nötig), der AudioContext ohne User-Geste bleibt auf iOS stumm |
| N-M4 | Offline beenden zeigt „Workout gespeichert“ und navigiert zu „Training nicht gefunden“ |
| N-M5 | 404-Dirty-Eintrag: Jeder Flush erzeugt einen Toast und einen Dead-Letter, eine Auflösung gibt es nicht |
| N-M6 | PATCH mit leerem Body erzeugt `UPDATE … SET WHERE`, das ist ein SQLite-Syntaxfehler → 500 |
| N-M7 | `PATCH completedAt: null` öffnet abgeschlossene Sessions wieder |
| N-M8 | „Plan B starten“ bei laufendem Plan A liefert kommentarlos A zurück |
| N-M9 | `navigate()` während des Renderns in `session-detail.tsx` |
| N-M10 | Profil: Selects zeigen Werte, die nicht gespeichert sind. Die Körperdaten-Karte hat keinen eigenen Speichern-Knopf |
| N-M11 | KI-Tausch im Training übernimmt Startgewicht/Ziel-Wdh. der alten Übung |

### Niedrig

- „3 Satzs“ in `plan-detail.tsx`
- Falscher Kommentar im Volumen-Query (`analytics.tsx`)
- CC-BY-SA-Bildcredits werden in der App nirgends angezeigt
- `/prs` zählt Sätze offener Sessions
- ISO-Woche: Server nach UTC, Client lokal
- KI-`matchExercise`: leerer Name passt auf die erste Katalogübung. Doppelte Übungen im KI-Plan
- Kein `app.onError` im Worker, keine Security-Header für die SPA
- Session-TTL ohne Verlängerung
- Gelöschte Pläne nehmen vergangenen Trainings den Titel
- `startSessionSchema.id` wird vom Client nie gesendet
- Übungssuche nicht akzentinsensitiv
- `user-scalable=no` (bewusster Trade-off, aber WCAG 1.4.4)

### Architektur-Empfehlungen

1. **Sync konsolidieren:** Die IDB-Session mit `revision` ist die einzige Quelle der Wahrheit, ein Single-Flight-Sync pro
   Session schickt immer die neueste Revision, `PATCH complete` erst nach bestätigtem PUT.
2. **Tests:** Einziges QA-Gate ist `tsc`. Für `sync.ts` und `use-active-workout` lohnen sich Vitest + `fake-indexeddb`,
   für die Routen `@cloudflare/vitest-pool-workers`.

---

## Positive Aspekte

- **Security-Grundlagen:** PBKDF2 mit Salt + Timing-Safe-Compare, Session-Tokens als SHA-256-Hash, HttpOnly/SameSite=Lax/Secure, Zod überall, IDOR-Schutz konsistent
- **AI-Härtung:** Prompt-Injection-Mitigation, Timeout, Fallback ohne API-Key
- **Sheet-Komponente:** Fokusfalle, Android-Back, Drag-to-Dismiss
- **Secrets:** gitignore, Build-Plugin, `.assetsignore`
- **TypeScript:** strict, keine `any`-Inflation
