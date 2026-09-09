import { toast } from "sonner";
import { ApiError, api } from "./api";
import {
  clearLocalSession,
  loadDirtySessions,
  readQueue,
  removeQueued,
  saveLocalSession,
  type DirtySessionEntry,
  type QueuedRequest,
} from "./db";
import type { SetLog } from "@shared/types";

/**
 * Statuscodes, bei denen dieselbe Anfrage auch später nie durchgeht:
 * ungültige Payload, Ziel weg, oder Session bereits abgeschlossen (409).
 * Solche Einträge werden verworfen, statt die Queue dauerhaft zu blockieren.
 */
function isPermanentFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  // 401/403 sind vorübergehend: nach erneutem Login klappt der Sync wieder.
  if (error.status === 401 || error.status === 403) return false;
  if (error.status === 408 || error.status === 429) return false;
  return error.status >= 400 && error.status < 500;
}

/** Einheitliches PUT-Format für Sätze (vgl. use-active-workout persist). */
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

const DEAD_LETTER_KEY = "fitness-neu:sync-dead";

type DeadLetterEntry = {
  id: string;
  method: string;
  path: string;
  status: number | null;
  message: string;
  at: number;
};

function pushDeadLetter(entry: Omit<DeadLetterEntry, "id" | "at">) {
  try {
    const raw = localStorage.getItem(DEAD_LETTER_KEY);
    const list = raw ? (JSON.parse(raw) as DeadLetterEntry[]) : [];
    list.push({
      ...entry,
      id: crypto.randomUUID(),
      at: Date.now(),
    });
    localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* localStorage nicht verfügbar (privater Modus) – Sync trotzdem fortsetzen */
  }
}

function notifyPermanentFailure(label: string, error: unknown) {
  const status = error instanceof ApiError ? error.status : null;
  const message = error instanceof Error ? error.message : "Sync fehlgeschlagen";
  pushDeadLetter({ method: label.split(" ")[0] ?? "", path: label, status, message });
  toast.error(`Sync verworfen (${status ?? "?"}): ${label} – ${message}`);
}

function isSetsPut(item: QueuedRequest): boolean {
  return item.method === "PUT" && item.path.includes("/sets");
}

async function sendQueued(item: QueuedRequest) {
  await api(item.path, {
    method: item.method,
    body: item.body == null ? undefined : JSON.stringify(item.body),
  });
}

let flushing = false;

export async function flushOfflineQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const queue = await readQueue();
    const queuedPuts = queue.filter(isSetsPut);
    const queuedRest = queue.filter((item) => !isSetsPut(item));

    const dirtyAll = await loadDirtySessions();
    const dirty = dirtyAll.filter((entry) => entry.dirty);

    // PUTs (Queue + Dirty) in chronologischer Reihenfolge, damit PUT sets
    // immer vor einem späteren PATCH complete derselben Session läuft.
    type PutOp =
      | { ts: number; kind: "queue"; item: QueuedRequest }
      | { ts: number; kind: "dirty"; entry: DirtySessionEntry };
    const putOps: PutOp[] = [
      ...queuedPuts.map((item): PutOp => ({ ts: item.createdAt, kind: "queue", item })),
      ...dirty.map((entry): PutOp => ({ ts: entry.updatedAt, kind: "dirty", entry })),
    ].sort((a, b) => a.ts - b.ts);

    for (const op of putOps) {
      if (op.kind === "queue") {
        const label = `${op.item.method} ${op.item.path}`;
        try {
          await sendQueued(op.item);
          await removeQueued(op.item.id);
        } catch (error) {
          if (isPermanentFailure(error)) {
            await removeQueued(op.item.id);
            notifyPermanentFailure(label, error);
            continue;
          }
          break;
        }
      } else {
        const path = `/api/sessions/${op.entry.session.id}/sets`;
        try {
          await api(path, {
            method: "PUT",
            body: JSON.stringify({ sets: toSetPayload(op.entry.session.sets) }),
          });
          await saveLocalSession(op.entry.session, op.entry.previous, false);
        } catch (error) {
          if (isPermanentFailure(error)) {
            // Etwa eine bereits abgeschlossene Session: lokale Kopie aufräumen,
            // sonst wird sie bei jedem Sync erneut abgelehnt.
            await clearLocalSession(op.entry.session.id);
            notifyPermanentFailure(`PUT ${path}`, error);
            continue;
          }
          break;
        }
      }
    }

    // Restliche Queue (v. a. PATCH complete) erst nach allen PUTs.
    for (const item of queuedRest) {
      const label = `${item.method} ${item.path}`;
      try {
        await sendQueued(item);
        await removeQueued(item.id);
      } catch (error) {
        if (isPermanentFailure(error)) {
          await removeQueued(item.id);
          notifyPermanentFailure(label, error);
          continue;
        }
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
