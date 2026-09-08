import { z } from "zod";

export function parseJson<T>(schema: z.ZodType<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    return { success: false, error: first?.message ?? "Ungültige Eingabe" };
  }
  return { success: true, data: result.data };
}
