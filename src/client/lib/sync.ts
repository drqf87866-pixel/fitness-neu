import { api } from "./api";
import { loadDirtySessions, readQueue, removeQueued, saveLocalSession } from "./db";

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
    } catch {
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
    } catch {
      /* keep dirty */
    }
  }
}
