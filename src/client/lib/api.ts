export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "Anfrage fehlgeschlagen" }))) as { error?: string };
    throw new ApiError(res.status, body.error ?? "Anfrage fehlgeschlagen");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
