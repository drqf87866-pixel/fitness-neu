const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

const DUMMY_SALT = new Uint8Array(16);

/**
 * Gleicher Rechenaufwand wie {@link verifyPassword}, aber ohne Treffer: für
 * unbekannte E-Mails, damit die Antwortzeit nicht verrät, ob ein Konto existiert.
 */
export async function burnPasswordCheck(password: string): Promise<false> {
  await pbkdf2(password, DUMMY_SALT, ITERATIONS);
  return false;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, iterRaw, saltB64, hashB64] = stored.split("$");
  if (algo !== "pbkdf2" || !iterRaw || !saltB64 || !hashB64) return false;
  const iterations = Number(iterRaw);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;
  const actual = await pbkdf2(password, b64ToBytes(saltB64), iterations);
  return timingSafeEqual(actual, b64ToBytes(hashB64));
}
