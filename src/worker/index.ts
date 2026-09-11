import { Hono } from "hono";
import { lt } from "drizzle-orm";
import { createDb } from "../db/client";
import { rateLimits, sessions } from "../db/schema";
import { authMiddleware } from "./middleware/auth";
import { analyticsRoutes } from "./routes/analytics";
import { aiRoutes } from "./routes/ai";
import { authRoutes } from "./routes/auth";
import { exerciseRoutes } from "./routes/exercises";
import { planRoutes } from "./routes/plans";
import { profileRoutes } from "./routes/profile";
import { sessionRoutes } from "./routes/sessions";
import type { AppEnv } from "./env";

const app = new Hono<AppEnv>();

// API-Antworten sind nutzerbezogen: Browser und Zwischen-Caches dürfen sie
// nicht heuristisch speichern. Der Übungskatalog wird zusätzlich vom Service
// Worker vorgehalten (vite.config.ts) und darf dort revalidiert werden.
app.use("/api/*", async (c, next) => {
  await next();
  c.header(
    "Cache-Control",
    c.req.path.startsWith("/api/exercises") ? "private, no-cache" : "no-store",
  );
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.use("/api/*", authMiddleware);
app.route("/api/auth", authRoutes);
app.route("/api/profile", profileRoutes);
app.route("/api/exercises", exerciseRoutes);
app.route("/api/plans", planRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/ai", aiRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Nicht gefunden" }, 404);
  }
  return c.text("Not found", 404);
});

app.onError((error, c) => {
  console.error(`${c.req.method} ${c.req.path}`, error);
  return c.json({ error: "Interner Fehler. Bitte später erneut versuchen." }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Cloudflare.Env) {
    const db = createDb(env.DB);
    const now = Date.now();
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
    await db.delete(rateLimits).where(lt(rateLimits.expiresAt, now));
  },
};
