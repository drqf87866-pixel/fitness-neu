import { ApiError, api } from "./api";
import {
  clearLocalSession,
  loadDirtySessions,
  readQueue,
  removeQueued,
  saveLocalSession,
} from "./db";

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

export async function flushOfflineQueue() {
  if (!navigator.onLine) return;

  const queue = await readQueue();
  for (const item of queue) {
    try {
      await api(item.path, {
        method: item.method,
        body: item.body == null ? undefined : JSON.stringify(item.body),
      });
      await removeQueued(item.id);
    } catch (error) {
      if (isPermanentFailure(error)) {
        // Aussichtslosen Eintrag entfernen und mit dem nächsten weitermachen.
        await removeQueued(item.id);
        continue;
      }
      // Netzwerkfehler oder Serverproblem: später erneut versuchen.
      break;
    }
  }

  const dirty = await loadDirtySessions();
  for (const entry of dirty) {
    if (!entry.dirty) continue;
    try {
      await api(`/api/sessions/${entry.session.id}/sets`, {
        method: "PUT",
        body: JSON.stringify({ sets: entry.session.sets }),
      });
      await saveLocalSession(entry.session, entry.previous, false);
    } catch (error) {
      if (isPermanentFailure(error)) {
        // Etwa eine bereits abgeschlossene Session: lokale Kopie aufräumen,
        // sonst wird sie bei jedem Sync erneut abgelehnt.
        await clearLocalSession(entry.session.id);
        continue;
      }
      /* sonst dirty lassen und beim nächsten Versuch erneut senden */
    }
  }
}
