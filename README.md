# Fitness Neu

Fitness-Tracker als installierbare Progressive Web App mit React-Frontend, Hono-API und Cloudflare D1. Die Anwendung bietet Trainingspläne, aktive Workouts, Verlauf, Analytics, Übungskatalog und einen KI-gestützten Trainingsplan-Generator.

**Live:** <https://fitness-neu.drqf87866.workers.dev>

**Healthcheck:** <https://fitness-neu.drqf87866.workers.dev/api/health>

## Funktionen

- Registrierung, Login und serverseitige Sessions
- Trainingspläne erstellen, bearbeiten und verwalten
- Aktive Workouts mit Satzprotokollierung und Rest-Timer
- Offline-First-Unterstützung für aktive Workouts über IndexedDB und PWA-Caching
- Übungskatalog mit benutzerdefinierten Übungen
- Trainingsverlauf und Volumen-Analytics
- KI-Trainingsplan-Generator über Gemini `gemini-3.5-flash-lite`
- Deterministischer Fallback-Plan, wenn Gemini nicht verfügbar ist

## Architektur und Stack

- React 19, Vite, React Router und TanStack Query
- Tailwind CSS v4 und shadcn-inspirierte UI-Komponenten
- Hono auf Cloudflare Workers
- Drizzle ORM mit Cloudflare D1
- Zod-Schemas für gemeinsame API-Validierung
- IndexedDB über `idb` und PWA über Workbox

Die Quellstruktur ist in vier Bereiche aufgeteilt:

| Verzeichnis | Zweck |
| --- | --- |
| `src/client/` | React-SPA, Seiten, Komponenten und Offline-Logik |
| `src/worker/` | Hono-API, Authentifizierung und API-Routen |
| `src/shared/` | Gemeinsame Zod-Schemas und Typen |
| `src/db/` | Drizzle-Schema, D1-Client und Seed-Daten |

## Voraussetzungen

- Node.js mit pnpm
- Cloudflare-Konto für Remote-Deployment
- Für die KI-Funktion ein Gemini API-Key

Abhängigkeiten installieren:

```bash
pnpm install
```

## Lokal entwickeln

Lokale D1-Datenbank migrieren und mit dem Übungskatalog befüllen:

```bash
pnpm db:migrate:local
pnpm db:seed
```

Optional den lokalen Gemini-Key in `.dev.vars` setzen. Die Datei ist gitignored:

```env
GEMINI_API_KEY=...
```

Danach die Anwendung starten:

```bash
pnpm dev
```

Die lokale Anwendung läuft unter <http://localhost:5173>.

## Cloudflare und Deployment

`wrangler.jsonc` konfiguriert den Worker `fitness-neu` und die D1-Datenbank `fitness-neu`. Die produktive D1-ID ist dort hinterlegt. Für die KI-Funktion das Secret einmalig setzen:

```bash
npx wrangler secret put GEMINI_API_KEY
```

Remote-Datenbank aktualisieren und den Übungskatalog laden:

```bash
pnpm db:migrate:remote
pnpm db:seed:remote
```

Build und Worker deployen:

```bash
pnpm run deploy
```

`pnpm run deploy` führt zuerst `vite build` und anschließend `wrangler deploy` aus. Wichtig: `pnpm deploy` ist bei pnpm ein eigener reservierter Befehl und darf hierfür nicht verwendet werden.

Nach dem Deployment kann der Healthcheck aufgerufen werden:

```bash
curl https://fitness-neu.drqf87866.workers.dev/api/health
```

Erwartete Antwort:

```json
{"ok":true}
```

Fehlt `GEMINI_API_KEY` oder schlägt die Gemini-Anfrage fehl, erzeugt `/api/ai/generate-plan` einen Plan aus dem Übungskatalog und liefert `usedFallback: true` zurück.

## Datenbankänderungen

1. `src/db/schema.ts` ändern.
2. Eine Migration erzeugen:

```bash
pnpm db:generate
```

3. Lokal anwenden und prüfen:

```bash
pnpm db:migrate:local
```

4. Für Produktion anwenden:

```bash
pnpm db:migrate:remote
```

Migrationen liegen in `drizzle/migrations/` und sollten nicht manuell bearbeitet werden.

## Verfügbare Scripts

| Script | Zweck |
| --- | --- |
| `pnpm install` | Abhängigkeiten installieren |
| `pnpm dev` | Vite und Cloudflare Workerd lokal starten |
| `pnpm build` | Produktions-Build erzeugen |
| `pnpm preview` | Produktions-Build lokal anzeigen |
| `pnpm db:generate` | Drizzle-Migration erzeugen |
| `pnpm db:migrate:local` | Migration auf lokaler D1 anwenden |
| `pnpm db:migrate:remote` | Migration auf produktiver D1 anwenden |
| `pnpm db:seed` | Übungskatalog in lokale D1 laden |
| `pnpm db:seed:remote` | Übungskatalog in produktive D1 laden |
| `pnpm cf-typegen` | Cloudflare-Typen aus `wrangler.jsonc` generieren |
| `pnpm run deploy` | Produktions-Build und Cloudflare-Deployment |

## Qualitätssicherung

Das Projekt enthält aktuell keinen konfigurierten Test Runner, Linter oder Formatter. Vor einem Deployment sollte mindestens ein Produktions-Build mit `pnpm build` erfolgreich durchlaufen.
