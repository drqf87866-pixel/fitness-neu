import { eq, sql } from "drizzle-orm";
import { rateLimits } from "../../db/schema";

export async function consumeRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const expiresAt = Date.now() + windowSec * 1000;

  const existing = await db
    .select({ count: rateLimits.count, expiresAt: rateLimits.expiresAt })
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    if (row.expiresAt < Date.now()) {
      await db
        .update(rateLimits)
        .set({ count: 1, expiresAt })
        .where(eq(rateLimits.key, key));
      return true;
    }
    if (row.count >= limit) return false;
    await db
      .update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.key, key));
    return true;
  }

  await db.insert(rateLimits).values({ key, count: 1, expiresAt });
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-forwarded-for") ?? "local";
}
