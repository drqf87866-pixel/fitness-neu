# Fitness Neu

Deutschsprachiger, Mobile-first Fitness-Tracker als PWA. Trainingspläne manuell oder per KI erstellen, Live-Workouts (auch offline) absolvieren, Verlauf und Fortschritt (Volumen, e1RM-PRs) auswerten.

## Features

- **Dashboard:** Begrüßung, Wochen-Volumen, Sessions der Woche, offene Session fortsetzen, Quick-Start
- **Pläne:** Liste, Detail, manuell erstellen/bearbeiten (Sätze, Reps, Pause, Gewicht), starten, löschen
- **KI-Generator:** Ziel-Chips + Freitext-Prompt, legt Plan an (mit Fallback-Plan ohne API-Key)
- **Workout:** Live-Training mit Satz-Erfassung, Rest-Timer, WakeLock, Notizen, Offline-Queue
- **Verlauf:** Wochenansicht, Session-Details, Löschen abgeschlossener Sessions
- **Fortschritt:** Volumen-Chart (4/8/12 Wochen), PR-Liste nach e1RM
- **Übungen:** Katalog mit Suche/Filter, Bildern sowie eigenen Übungen (CRUD)
- **Profil:** Name, Ziel, Gewicht, Level, Kalorienziel, Einheit (kg/lbs), Passwortwechsel
- **PWA:** installierbar, Dark-Theme, Bottom-Navigation, Offline-Banner

Routen u. a.: `/`, `/login`, `/register`, `/plans`, `/plans/new`, `/plans/generate`, `/plans/:planId`, `/workout/:id`, `/history`, `/sessions/:id`, `/analytics`, `/exercises`, `/profile`.

## Tech-Stack

| Bereich | Technologie |
| --- | --- |
| Frontend | React 19, React-Router 7, TanStack Query 5, Tailwind CSS 4, shadcn, lucide-react, sonner, idb |
| Backend | Hono 4 auf Cloudflare Workers (`src/worker/index.ts`) |
| DB / ORM | Cloudflare D1 (SQLite), Drizzle ORM, Drizzle Kit, Zod (shared) |
| Build / Deploy | Vite 7, `@cloudflare/vite-plugin`, `vite-plugin-pwa`, Wrangler 4, TypeScript strict |
| KI | Google Gemini via REST (optional, mit heuristischem Fallback) |

## Voraussetzungen

- Node.js + pnpm (siehe `package.json`, `pnpm-lock.yaml`)
- Für Remote/Deploy: Cloudflare-Account + `wrangler login`
- Optional für KI-Generierung: `GEMINI_API_KEY` (ohne Key greift der Fallback-Plan)

## Schnellstart lokal

```bash
pnpm install
cp .dev.vars.example .dev.vars
# GEMINI_API_KEY in .dev.vars eintragen (optional)

pnpm db:migrate:local
pnpm db:seed

pnpm run dev
```

`pnpm run dev` (`vite`) startet Frontend + Worker + lokale D1 gemeinsam – kein separates `wrangler dev` nötig.

Qualitätssicherung:

```bash
pnpm typecheck
```

## Skripte

| Skript | Befehl | Zweck |
| --- | --- | --- |
| `pnpm run dev` | `vite` | Lokaler Dev-Server inkl. Worker + D1 lokal |
| `pnpm run build` | `vite build` | Produktions-Build nach `dist/` |
| `pnpm run preview` | `build && vite preview` | Build lokal prüfen |
| `pnpm run deploy` | `build && wrangler deploy` | Build + Deploy auf Cloudflare |
| `pnpm typecheck` | `tsc --noEmit` | Strikter Typecheck |
| `pnpm cf-typegen` | `wrangler types` | Typen für Worker-Env generieren |
| `pnpm db:generate` | `drizzle-kit generate` | Neue Migration aus `src/db/schema.ts` erzeugen |
| `pnpm db:migrate:local` | `wrangler d1 migrations apply DB --local` | Migrationen lokal anwenden |
| `pnpm db:migrate:remote` | `wrangler d1 migrations apply DB --remote` | Migrationen remote anwenden |
| `pnpm db:seed` | `wrangler d1 execute DB --local --file=src/db/seed.sql` | Übungskatalog lokal seeden |
| `pnpm db:seed:remote` | `wrangler d1 execute DB --remote --file=src/db/seed.sql` | Übungskatalog remote seeden |

Es gibt keine Test-, Lint- oder Format-Skripte.

## Umgebungsvariablen & Datenbank

Lokal via `.dev.vars` (gitignored, siehe `.dev.vars.example`), remote via Wrangler-Secret:

```bash
wrangler secret put GEMINI_API_KEY
```

| Variable | Benötigt | Zweck |
| --- | --- | --- |
| `GEMINI_API_KEY` | optional | KI-Plangenerierung; ohne Key wird ein Fallback-Plan erstellt |

- D1-Binding: `DB`, Schema in `src/db/schema.ts`, Migrationen in `drizzle/migrations/`, Seed in `src/db/seed.sql` (`INSERT OR IGNORE`).
- Tabellen u. a.: `users`, `sessions` (Login-Tokens), `rate_limits`, `exercises`, `workout_plans`, `plan_exercises`, `workout_logs`, `set_logs`.
- Reihenfolge beachten: erst `db:migrate:*`, dann `db:seed:*`.

## Deployment

Konfiguration in `wrangler.jsonc`: Worker-Einstieg `src/worker/index.ts`, SPA-Fallback für Assets, `run_worker_first` für `/api/*`, D1-Binding `DB`, Cron täglich `0 3 * * *` (löscht abgelaufene Sessions und Rate-Limits).

```bash
wrangler login
pnpm db:migrate:remote
pnpm db:seed:remote
wrangler secret put GEMINI_API_KEY
pnpm run deploy
```

## Projektstruktur (gekürzt)

```text
src/
  client/        # React-App (App.tsx-Routing, pages/, components/, hooks/, lib/)
  worker/        # Hono-API (index.ts, routes/, middleware/auth.ts, lib/)
  shared/        # geteilte Zod-Schemas und Typen
  db/            # Drizzle-Schema, DB-Client, seed.sql
drizzle/migrations/
public/          # PWA-Icons, favicon, exercises-Bilder
scripts/         # Bild-/Icon-Hilfsskripte (z. B. Download, Icon-Generierung)
```

## Hinweise

- **PWA/Offline:** Service Worker cacht nur lesende `GET /api/exercises`-Requests (`NetworkFirst`, 1 h). Auth-, Session- und Analytics-Requests bleiben `NetworkOnly`. Offene Sets werden in IndexedDB (`fitness-neu`) zwischengespeichert und synchronisiert.
- **Bilder:** Übungsbilder in `public/exercises/` stammen aus `yuhonas/free-exercise-db` (siehe `scripts/`). Nicht jede Übung hat ein Bild.
- **Artefakte:** `dist/`, `.wrangler/` und `node_modules/` werden nicht versioniert.

## Roadmap

<!-- TODO: Roadmap ergänzen, z. B. geplante Features, Verbesserungen, bekannte Einschränkungen -->
