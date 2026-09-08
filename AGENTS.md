# Agent Guide

## Project Shape

- Single pnpm package (not a monorepo): React 19/Vite client in `src/client/`, Hono Cloudflare Worker in `src/worker/`, shared Zod schemas/types in `src/shared/`, Drizzle D1 schema/client/seed in `src/db/`.
- `src/worker/index.ts` is the server entrypoint; `/api/*` routes are handled by Hono, all other paths serve the SPA. `src/client/main.tsx` is the browser entrypoint and registers the PWA service worker plus offline-workout queue flushing.
- `wrangler.jsonc` defines the Worker, D1 binding `DB`, and a 03:00 UTC cron for session/rate-limit cleanup.

## Commands

- Install with `pnpm install` and start local development with `pnpm dev`.
- Local development data requires `pnpm db:migrate:local` followed by `pnpm db:seed`; local secrets belong in the gitignored `.dev.vars` file.
- Production verification: `pnpm build`. There is no test runner, linter, formatter, or typecheck script configured.
- `pnpm preview` rebuilds before starting Vite preview. `pnpm run deploy` builds and deploys the Worker; use this exact command — `pnpm deploy` is pnpm's reserved package-deployment command.
- Use `pnpm cf-typegen` after changing Cloudflare bindings/configuration; the generated `worker-configuration.d.ts` is gitignored.

## Database and Deployment

- Schema changes: edit `src/db/schema.ts`, run `pnpm db:generate`, then apply with `pnpm db:migrate:local`; inspect locally before using `pnpm db:migrate:remote`.
- Generated files under `drizzle/migrations/` are the migration source of truth and must not be manually edited.
- `pnpm db:seed` and `pnpm db:seed:remote` execute `src/db/seed.sql`; the remote variants change production D1 and require explicit care.
- The AI route uses `GEMINI_API_KEY` from `.dev.vars` locally or a Worker secret remotely (`npx wrangler secret put GEMINI_API_KEY`). It has a deterministic catalog-based fallback when Gemini is unavailable.

## Conventions

- TypeScript is strict with unused locals/parameters rejected, and aliases are `@/*` for `src/client/*` and `@shared/*` for `src/shared/*`.
- Auth is global to `/api/*` via middleware; only `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` are public. Changing API contracts requires updating shared schemas/types, the corresponding Hono route, and the client API usage together.
- Preserve the offline-first workout flow and PWA caching behavior when changing workout or API code; `src/client/lib/sync.ts` and `vite.config.ts` define the queue/cache behavior.
