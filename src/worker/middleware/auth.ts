import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { readSessionUserId, SESSION_COOKIE } from "../lib/session";
import { dbFrom } from "../lib/helpers";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
]);

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.req.path.startsWith("/api/") || PUBLIC_PATHS.has(c.req.path)) {
    return next();
  }

  const token = getCookie(c, SESSION_COOKIE);
  const userId = await readSessionUserId(dbFrom(c), token);
  if (!userId) {
    return c.json({ error: "Nicht angemeldet" }, 401);
  }
  c.set("userId", userId);
  await next();
});
