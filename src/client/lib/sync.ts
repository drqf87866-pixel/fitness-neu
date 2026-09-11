import { toast } from "sonner";
import { ApiError, api } from "./api";
import {
  clearLocalSession,
  loadLocalSession,
  loadLocalSessions,
  markOrphaned,
  markSynced,
  readQueue,
  removeQueued,
  type QueuedRequest,
} from "./db";
import { invalidateTrainingQueries, queryClient } from "./query-client";
import type { SetLog } from "@shared/types";

/**
 * Statuscodes, bei denen dieselbe Anfrage auch später nie durchgeht:
 * ungültige Payload, Session weg (404) oder bereits abgeschlossen (409).
 * 401/403 (nach erneutem Login klappt es wieder), 408 und 429 sind vorübergehend.
 */
function isPermanentFailure(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401 || error.status === 403) return false;
  if (error.status === 408 || error.status === 429) return false;
  return error.status >= 400 && error.status < 500;
}

/** Einheitliches PUT-Format für Sätze. */
export function toSetPayload(sets: SetLog[]) {
  return sets.map((set) => ({
    id: set.id,
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    isCompleted: set.isCompleted,
  }));
}

// ---------------------------------------------------------------------------
// Dead-Letters: verworfene Einträge der Alt-Queue (vor dem Revisions-Sync).
// ---------------------------------------------------------------------------

const DEAD_LETTER_KEY = "fitness-neu:sync-dead";

export type DeadLetterEntry = {
  id: string;
  method: string;
  path: string;
  status: number | null;
  message: string;
  at: number;
};

export function readDeadLetters(): DeadLetterEntry[] {
  try {
    const raw = localStorage.getItem(DEAD_LETTER_KEY);
    return raw ? (JSON.parse(raw) as DeadLetterEntry[]) : [];
  } catch {
    return [];
  }
}

function writeDeadLetters(list: DeadLetterEntry[]) {
  try {
    if (list.length) localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(list.slice(-50)));
    else localStorage.removeItem(DEAD_LETTER_KEY);
  } catch {
    /* localStorage nicht verfügbar (privater Modus) – Sync trotzdem fortsetzen */
  }
}

export function removeDeadLetter(id: string) {
  writeDeadLetters(readDeadLetters().filter((entry) => entry.id !== id));
  void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
}

export function clearDeadLetters() {
  writeDeadLetters([]);
  void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
}

function pushDeadLetter(item: QueuedRequest, error: ApiError) {
  writeDeadLetters([
    ...readDeadLetters(),
    {
      id: crypto.randomUUID(),
      method: item.method,
      path: item.path,
      status: error.status,
      message: error.message,
      at: Date.now(),
    },
  ]);
  void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
}

// ---------------------------------------------------------------------------
// Session-Sync: pro Session genau ein Lauf gleichzeitig.
// ---------------------------------------------------------------------------

/**
 * - `synced`: Server hat die neueste lokale Revision
 * - `completed`: Sätze übertragen und Training abgeschlossen, lokale Kopie entfernt
 * - `pending`: vorübergehender Fehler, nächster Versuch beim nächsten Sync
 * - `orphaned`: Server lehnt dauerhaft ab, Daten bleiben lokal (Profil → Sync-Probleme)
 */
export type SyncOutcome = "synced" | "completed" | "pending" | "orphaned";

async function orphan(id: string, error: ApiError) {
  await markOrphaned(id, error.status, error.message);
  toast.error(`Training konnte nicht synchronisiert werden (${error.status}): ${error.message}`, {
    description: "Die Daten bleiben auf dem Gerät – Details im Profil unter „Sync-Probleme“.",
  });
  void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
}

async function runSync(id: string): Promise<SyncOutcome> {
  // Schleife: kam während des Uploads eine neuere Revision hinzu, wird sie
  // direkt nachgeschoben – der Server endet so immer auf dem neuesten Stand.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const entry = await loadLocalSession(id);
    if (!entry) return "synced";
    if (entry.orphaned) return "orphaned";

    if (entry.dirty) {
      try {
        await api(`/api/sessions/${id}/sets`, {
          method: "PUT",
          body: JSON.stringify({ sets: toSetPayload(entry.session.sets) }),
        });
      } catch (error) {
        if (isPermanentFailure(error)) {
          await orphan(id, error);
          return "orphaned";
        }
        return "pending";
      }
      const clean = await markSynced(id, entry.revision);
      if (!clean) continue;
    }

    if (!entry.pendingComplete) return "synced";

    // Abschluss erst, nachdem die Sätze nachweislich auf dem Server sind –
    // sonst lehnt der Server einen späteren PUT mit 409 ab.
    try {
      await api(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(entry.pendingComplete),
      });
    } catch (error) {
      if (isPermanentFailure(error)) {
        await orphan(id, error);
        return "orphaned";
      }
      return "pending";
    }
    await clearLocalSession(id, entry.revision);
    void invalidateTrainingQueries();
    return "completed";
  }
  return "pending";
}

const running = new Map<string, Promise<SyncOutcome>>();
const rerun = new Set<string>();

/**
 * Synchronisiert eine Session. Läuft bereits ein Sync für sie, hängt der
 * laufende Sync genau eine weitere Runde an, und alle Aufrufer der
 * Zwischenzeit teilen sich dieses Ergebnis. Wirft nie.
 */
export function syncSession(id: string): Promise<SyncOutcome> {
  const current = running.get(id);
  if (current) {
    rerun.add(id);
    return current;
  }
  const promise = (async () => {
    try {
      let outcome: SyncOutcome;
      do {
        rerun.delete(id);
        outcome = await runSync(id);
      } while (rerun.has(id) && outcome === "synced");
      return outcome;
    } catch {
      return "pending" as const;
    } finally {
      running.delete(id);
    }
  })();
  running.set(id, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Voller Sync beim Start und bei Wiederverbindung.
// ---------------------------------------------------------------------------

function isSetsPut(item: QueuedRequest): boolean {
  return item.method === "PUT" && item.path.includes("/sets");
}

/** Alt-Queue in Reihenfolge abarbeiten. false = vorübergehender Fehler, abbrechen. */
async function sendLegacy(items: QueuedRequest[]): Promise<boolean> {
  for (const item of items) {
    try {
      await api(item.path, {
        method: item.method,
        body: item.body == null ? undefined : JSON.stringify(item.body),
      });
      await removeQueued(item.id);
    } catch (error) {
      if (isPermanentFailure(error)) {
        await removeQueued(item.id);
        pushDeadLetter(item, error);
        toast.error(`Sync verworfen (${error.status}): ${item.method} ${item.path} – ${error.message}`);
        continue;
      }
      return false;
    }
  }
  return true;
}

let flushing = false;

export async function flushOfflineQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    // Restbestände der alten Queue: PUTs vor allem anderen, damit ein
    // gequeueter Abschluss nie vor den zugehörigen Sätzen ankommt.
    const legacy = await readQueue();
    const legacyPuts = legacy.filter(isSetsPut);
    const legacyRest = legacy.filter((item) => !isSetsPut(item));
    if (!(await sendLegacy(legacyPuts))) return;

    const entries = await loadLocalSessions();
    for (const entry of entries) {
      if (entry.orphaned || (!entry.dirty && !entry.pendingComplete)) continue;
      const outcome = await syncSession(entry.session.id);
      if (outcome === "pending") return;
    }

    if (!(await sendLegacy(legacyRest))) return;
    if (legacy.length) void invalidateTrainingQueries();
  } finally {
    flushing = false;
  }
}
