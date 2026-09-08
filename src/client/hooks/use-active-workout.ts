import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  clearLocalSession,
  enqueueRequest,
  loadLocalSession,
  saveLocalSession,
} from "@/lib/db";
import { displayToKg } from "@/lib/units";
import type { PreviousSet, SetLog, Unit, WorkoutSession } from "@shared/types";

export function useActiveWorkout(sessionId: string | undefined, unit: Unit) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [previous, setPrevious] = useState<PreviousSet[]>([]);
  const [rest, setRest] = useState({ running: false, seconds: 90 });
  const [offline, setOffline] = useState(!navigator.onLine);
  const timer = useRef<number | null>(null);

  const persist = useCallback(
    async (next: WorkoutSession, prev: PreviousSet[], remote: boolean) => {
      await saveLocalSession(next, prev, !remote);
      if (!remote) return;
      try {
        await api(`/api/sessions/${next.id}/sets`, {
          method: "PUT",
          body: JSON.stringify({
            sets: next.sets.map((set) => ({
              id: set.id,
              exerciseId: set.exerciseId,
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
              isCompleted: set.isCompleted,
            })),
          }),
        });
        await saveLocalSession(next, prev, false);
      } catch {
        await enqueueRequest("PUT", `/api/sessions/${next.id}/sets`, { sets: next.sets });
      }
    },
    [],
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const local = await loadLocalSession(sessionId);
      if (local && !cancelled) {
        setSession(local.session);
        setPrevious(local.previous);
      }
      try {
        const remote = await api<{ session: WorkoutSession }>(`/api/sessions/${sessionId}`);
        const prevRes = await api<{ previous: PreviousSet[] }>(`/api/sessions/${sessionId}/previous`);
        if (cancelled) return;
        const merged = local?.dirty ? local.session : remote.session;
        setSession(merged);
        setPrevious(prevRes.previous);
        await saveLocalSession(merged, prevRes.previous, Boolean(local?.dirty));
      } catch {
        if (!local) toast.error("Session konnte nicht geladen werden");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const schedulePersist = useCallback(
    (next: WorkoutSession, prev: PreviousSet[]) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void persist(next, prev, navigator.onLine);
      }, 400);
    },
    [persist],
  );

  const updateSet = useCallback(
    (setId: string, patch: Partial<Pick<SetLog, "weight" | "reps" | "isCompleted">>, displayWeight?: boolean) => {
      setSession((current) => {
        if (!current) return current;
        const next: WorkoutSession = {
          ...current,
          sets: current.sets.map((set) => {
            if (set.id !== setId) return set;
            const weight =
              patch.weight === undefined
                ? set.weight
                : displayWeight
                  ? displayToKg(patch.weight, unit)
                  : patch.weight;
            return { ...set, ...patch, weight };
          }),
        };
        schedulePersist(next, previous);
        return next;
      });
    },
    [previous, schedulePersist, unit],
  );

  const toggleSet = useCallback(
    (setId: string) => {
      setSession((current) => {
        if (!current) return current;
        const target = current.sets.find((set) => set.id === setId);
        const nextCompleted = !target?.isCompleted;
        const next: WorkoutSession = {
          ...current,
          sets: current.sets.map((set) =>
            set.id === setId ? { ...set, isCompleted: nextCompleted } : set,
          ),
        };
        if (nextCompleted && target) {
          const meta = current.exercises.find((ex) => ex.exerciseId === target.exerciseId);
          setRest({ running: true, seconds: meta?.restSeconds ?? 90 });
        }
        schedulePersist(next, previous);
        return next;
      });
    },
    [previous, schedulePersist],
  );

  const completeWorkout = useCallback(
    async (notes?: string) => {
      if (!session) return;
      const payload = { completedAt: Date.now(), notes: notes ?? session.notes };
      try {
        await persist(session, previous, navigator.onLine);
        if (navigator.onLine) {
          await api(`/api/sessions/${session.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await enqueueRequest("PATCH", `/api/sessions/${session.id}`, payload);
        }
        await clearLocalSession(session.id);
      } catch {
        await enqueueRequest("PATCH", `/api/sessions/${session.id}`, payload);
        toast.message("Workout lokal gespeichert, Sync folgt online.");
      }
    },
    [persist, previous, session],
  );

  const grouped = useMemo(() => {
    if (!session) return [];
    return session.exercises.map((ex) => ({
      ...ex,
      sets: session.sets
        .filter((set) => set.exerciseId === ex.exerciseId)
        .sort((a, b) => a.setNumber - b.setNumber),
    }));
  }, [session]);

  return {
    session,
    previous,
    grouped,
    rest,
    offline,
    updateSet,
    toggleSet,
    completeWorkout,
    stopRest: () => setRest((value) => ({ ...value, running: false })),
  };
}
