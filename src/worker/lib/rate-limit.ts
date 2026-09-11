import { sql } from "drizzle-orm";
import { rateLimits } from "../../db/schema";
import type { Database } from "../../db/client";

/**
 * Zählt einen Versuch und meldet, ob er innerhalb des Limits liegt.
 *
 * Ein einziger Upsert statt SELECT + UPDATE: parallele Requests können sonst
 * beide `count < limit` lesen und gemeinsam durchrutschen. Abgelaufene Fenster
 * beginnen im selben Statement neu (SQLite wertet alle SET-Ausdrücke mit den
 * alten Zeilenwerten aus).
 */
export async function consumeRateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const now = Date.now();
  const expiresAt = now + windowSec * 1000;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.expiresAt} < ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${rateLimits.expiresAt} < ${now} THEN ${expiresAt} ELSE ${rateLimits.expiresAt} END`,
      },
    })
    .returning({ count: rateLimits.count });
  return (row?.count ?? 1) <= limit;
}

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-forwarded-for") ?? "local";
}
