import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PreviousSet, WorkoutSession } from "@shared/types";

/** Alt-Format der Offline-Queue. Neue Einträge entstehen nicht mehr, nur Restbestände werden abgearbeitet. */
export type QueuedRequest = {
  id: string;
  method: string;
  path: string;
  body: unknown;
  createdAt: number;
};

/** Abschluss, der erst nach bestätigtem Satz-Upload an den Server geht. */
export type PendingComplete = { completedAt: number; notes: string | null };

/**
 * Lokale Kopie einer Trainings-Session – die Quelle der Wahrheit, solange
 * `dirty` gesetzt ist. `revision` steigt mit jeder lokalen Änderung; ein Sync
 * markiert die Kopie nur dann als sauber, wenn seit seinem Snapshot keine
 * neuere Revision gespeichert wurde.
 */
export type LocalSessionEntry = {
  session: WorkoutSession;
  previous: PreviousSet[];
  dirty: boolean;
  updatedAt: number;
  revision: number;
  pendingComplete: PendingComplete | null;
  /** Server lehnt die Session dauerhaft ab (404/409/400) – wird nicht mehr gesendet. */
  orphaned: { status: number | null; message: string; at: number } | null;
};

interface FitnessDB extends DBSchema {
  sessions: {
    key: string;
    value: LocalSessionEntry;
  };
  queue: {
    key: string;
    value: QueuedRequest;
  };
}

let dbPromise: Promise<IDBPDatabase<FitnessDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FitnessDB>("fitness-neu", 1, {
      upgrade(db) {
        db.createObjectStore("sessions");
        db.createObjectStore("queue", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

/** Einträge aus Versionen ohne Revision/Orphan-Feld auf das aktuelle Format bringen. */
function normalize(entry: LocalSessionEntry | undefined): LocalSessionEntry | undefined {
  if (!entry) return undefined;
  return {
    ...entry,
    revision: entry.revision ?? 0,
    pendingComplete: entry.pendingComplete ?? null,
    orphaned: entry.orphaned ?? null,
  };
}

export async function loadLocalSession(id: string) {
  const db = await getDb();
  return normalize(await db.get("sessions", id));
}

export async function loadLocalSessions(): Promise<LocalSessionEntry[]> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  return all.map((entry) => normalize(entry)!).sort((a, b) => a.updatedAt - b.updatedAt);
}

/**
 * Lokale Änderung festschreiben: Revision hochzählen und als dirty markieren.
 * Immer VOR dem Server-Upload aufrufen – bricht die App währenddessen ab,
 * bleibt die Änderung so für den nächsten Sync erhalten.
 */
export async function writeLocalChange(
  session: WorkoutSession,
  previous: PreviousSet[],
  pendingComplete?: PendingComplete,
): Promise<number> {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(session.id));
  const revision = (existing?.revision ?? 0) + 1;
  await tx.store.put(
    {
      session,
      previous,
      dirty: true,
      updatedAt: Date.now(),
      revision,
      pendingComplete: pendingComplete ?? existing?.pendingComplete ?? null,
      orphaned: existing?.orphaned ?? null,
    },
    session.id,
  );
  await tx.done;
  return revision;
}

/**
 * Server-Stand beim Laden übernehmen. Eine ungesicherte lokale Kopie
 * (dirty oder mit ausstehendem Abschluss) wird dabei nie überschrieben.
 * Liefert true, wenn der Server-Stand gespeichert wurde.
 */
export async function storeServerSession(
  session: WorkoutSession,
  previous: PreviousSet[],
): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(session.id));
  if (existing && (existing.dirty || existing.pendingComplete || existing.orphaned)) {
    await tx.done;
    return false;
  }
  await tx.store.put(
    {
      session,
      previous,
      dirty: false,
      updatedAt: Date.now(),
      revision: existing?.revision ?? 0,
      pendingComplete: null,
      orphaned: null,
    },
    session.id,
  );
  await tx.done;
  return true;
}

/** Nach bestätigtem Upload von `revision`: nur als sauber markieren, wenn nichts Neueres kam. */
export async function markSynced(id: string, revision: number): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(id));
  if (!existing || existing.revision !== revision) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...existing, dirty: false }, id);
  await tx.done;
  return true;
}

export async function markOrphaned(id: string, status: number | null, message: string) {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(id));
  if (existing) {
    await tx.store.put({ ...existing, orphaned: { status, message, at: Date.now() } }, id);
  }
  await tx.done;
}

/** Nutzer möchte eine abgelehnte Session erneut senden. */
export async function clearOrphaned(id: string) {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(id));
  if (existing) await tx.store.put({ ...existing, orphaned: null }, id);
  await tx.done;
}

/** Noch nicht (vollständig) beim Server angekommene Sessions. */
export async function loadUnsyncedSessions(): Promise<LocalSessionEntry[]> {
  const all = await loadLocalSessions();
  return all.filter((entry) => entry.dirty || entry.pendingComplete || entry.orphaned);
}

/** Lokale Kopie entfernen – optional nur, wenn sie noch auf `revision` steht. */
export async function clearLocalSession(id: string, revision?: number) {
  const db = await getDb();
  const tx = db.transaction("sessions", "readwrite");
  const existing = normalize(await tx.store.get(id));
  if (existing && (revision === undefined || existing.revision === revision)) {
    await tx.store.delete(id);
  }
  await tx.done;
}

/** Beim Logout: nichts vom vorherigen Konto auf dem Gerät zurücklassen. */
export async function clearAllLocalData() {
  const db = await getDb();
  const tx = db.transaction(["sessions", "queue"], "readwrite");
  await Promise.all([tx.objectStore("sessions").clear(), tx.objectStore("queue").clear(), tx.done]);
}

export async function readQueue(): Promise<QueuedRequest[]> {
  const db = await getDb();
  const all = await db.getAll("queue");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueued(id: string) {
  const db = await getDb();
  await db.delete("queue", id);
}
