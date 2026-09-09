import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toSetPayload } from "@/lib/sync";
import {
  clearLocalSession,
  enqueueRequest,
  loadLocalSession,
  saveLocalSession,
} from "@/lib/db";
import { useOnline } from "@/hooks/use-online";
import { displayToKg } from "@/lib/units";
import type { PreviousSet, SetLog, Unit, WorkoutSession } from "@shared/types";

const DEFAULT_REST_SECONDS = 90;
const DEFAULT_SETS_PER_ADDED_EXERCISE = 3;
/** setLogInputSchema begrenzt setNumber auf 30 – darüber lehnt der Server den PUT ab. */
export const MAX_SETS_PER_EXERCISE = 30;

export type RestState = { endsAt: number | null; total: number };

export type AddableExercise = {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
};

export function useActiveWorkout(sessionId: string | undefined, unit: Unit) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [previous, setPrevious] = useState<PreviousSet[]>([]);
  const [rest, setRest] = useState<RestState>({ endsAt: null, total: DEFAULT_REST_SECONDS });
  const [loadFailed, setLoadFailed] = useState(false);
  const online = useOnline();
  const timer = useRef<number | null>(null);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const previousRef = useRef<PreviousSet[]>([]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    previousRef.current = previous;
  }, [previous]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const persist = useCallback(
    async (next: WorkoutSession, prev: PreviousSet[], remote: boolean) => {
      await saveLocalSession(next, prev, !remote);
      if (!remote) return;
      const body = { sets: toSetPayload(next.sets) };
      try {
        await api(`/api/sessions/${next.id}/sets`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        await saveLocalSession(next, prev, false);
      } catch {
        await enqueueRequest("PUT", `/api/sessions/${next.id}/sets`, body);
      }
    },
    [],
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoadFailed(false);
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
        if (cancelled) return;
        if (!local) {
          setLoadFailed(true);
          toast.error("Session konnte nicht geladen werden");
        }
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

  /** Gemeinsamer Pfad für alle Satz-Mutationen: State setzen und gepuffert speichern. */
  const mutateSession = useCallback(
    (update: (current: WorkoutSession) => WorkoutSession) => {
      const current = sessionRef.current;
      if (!current) return;
      const next = update(current);
      if (next === current) return;
      sessionRef.current = next;
      setSession(next);
      schedulePersist(next, previousRef.current);
    },
    [schedulePersist],
  );

  const updateSet = useCallback(
    (
      setId: string,
      patch: Partial<Pick<SetLog, "weight" | "reps" | "isCompleted">>,
      displayWeight?: boolean,
    ) => {
      mutateSession((current) => ({
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
      }));
    },
    [mutateSession, unit],
  );

  const startRest = useCallback((seconds: number) => {
    // Neue Deadline bei jedem Start: identische Pausendauern starten dadurch
    // zuverlässig neu, auch wenn die vorherige Pause noch lief.
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
  }, []);

  const stopRest = useCallback(() => {
    setRest((current) => (current.endsAt === null ? current : { ...current, endsAt: null }));
  }, []);

  const extendRest = useCallback((deltaSeconds: number) => {
    setRest((current) =>
      current.endsAt === null
        ? current
        : { endsAt: current.endsAt + deltaSeconds * 1000, total: current.total + deltaSeconds },
    );
  }, []);

  const toggleSet = useCallback(
    (setId: string) => {
      // Über Ref statt Render-Closure lesen: zwei schnelle Taps vor dem
      // nächsten Render sehen dadurch den jeweils aktuellen Stand.
      const current = sessionRef.current;
      const target = current?.sets.find((set) => set.id === setId);
      if (!current || !target) return;
      const nextCompleted = !target.isCompleted;

      mutateSession((prev) => ({
        ...prev,
        sets: prev.sets.map((set) =>
          set.id === setId ? { ...set, isCompleted: nextCompleted } : set,
        ),
      }));

      if (!nextCompleted) return;
      const meta = current.exercises.find((ex) => ex.exerciseId === target.exerciseId);
      navigator.vibrate?.(40);
      startRest(meta?.restSeconds ?? DEFAULT_REST_SECONDS);
    },
    [mutateSession, startRest],
  );

  const addSet = useCallback(
    (exerciseId: string) => {
      mutateSession((current) => {
        const ofExercise = current.sets.filter((set) => set.exerciseId === exerciseId);
        if (ofExercise.length >= MAX_SETS_PER_EXERCISE) return current;
        const last = ofExercise[ofExercise.length - 1];
        const setNumber = ofExercise.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1;
        const added: SetLog = {
          id: crypto.randomUUID(),
          workoutLogId: current.id,
          exerciseId,
          setNumber,
          // Startwerte vom letzten Satz übernehmen: im Gym fast immer richtig.
          weight: last?.weight ?? 0,
          reps: last?.reps ?? 8,
          isCompleted: false,
        };
        return { ...current, sets: [...current.sets, added] };
      });
    },
    [mutateSession],
  );

  const removeSet = useCallback(
    (setId: string) => {
      mutateSession((current) => {
        const target = current.sets.find((set) => set.id === setId);
        if (!target) return current;
        const remaining = current.sets.filter((set) => set.id !== setId);
        // Satznummern der betroffenen Übung wieder lückenlos machen.
        let counter = 0;
        const renumbered = remaining.map((set) => {
          if (set.exerciseId !== target.exerciseId) return set;
          counter += 1;
          return set.setNumber === counter ? set : { ...set, setNumber: counter };
        });
        const stillUsed = renumbered.some((set) => set.exerciseId === target.exerciseId);
        return {
          ...current,
          sets: renumbered,
          exercises: stillUsed
            ? current.exercises
            : current.exercises.filter((ex) => ex.exerciseId !== target.exerciseId),
        };
      });
    },
    [mutateSession],
  );

  const removeExercise = useCallback(
    (exerciseId: string) => {
      mutateSession((current) => ({
        ...current,
        sets: current.sets.filter((set) => set.exerciseId !== exerciseId),
        exercises: current.exercises.filter((ex) => ex.exerciseId !== exerciseId),
      }));
    },
    [mutateSession],
  );

  const replaceExercise = useCallback(
    (
      oldExerciseId: string,
      replacement: { exerciseId: string; name: string; primaryMuscle: string },
    ) => {
      mutateSession((current) => {
        const oldSets = current.sets.filter((set) => set.exerciseId === oldExerciseId);
        const setCount = Math.max(oldSets.length, 1);
        const newSets: SetLog[] = Array.from({ length: setCount }, (_, index) => ({
          id: crypto.randomUUID(),
          workoutLogId: current.id,
          exerciseId: replacement.exerciseId,
          setNumber: index + 1,
          weight: 0,
          reps: 8,
          isCompleted: false,
        }));
        return {
          ...current,
          exercises: current.exercises.map((ex) =>
            ex.exerciseId === oldExerciseId
              ? {
                  ...ex,
                  exerciseId: replacement.exerciseId,
                  name: replacement.name,
                  primaryMuscle: replacement.primaryMuscle,
                }
              : ex,
          ),
          sets: [
            ...current.sets.filter((set) => set.exerciseId !== oldExerciseId),
            ...newSets,
          ],
        };
      });
    },
    [mutateSession],
  );

  const addExercises = useCallback(
    (toAdd: AddableExercise[]) => {
      if (!toAdd.length) return;
      mutateSession((current) => {
        const known = new Set(current.exercises.map((ex) => ex.exerciseId));
        const fresh = toAdd.filter((ex) => !known.has(ex.exerciseId));
        if (!fresh.length) return current;
        const newSets = fresh.flatMap((ex) =>
          Array.from(
            { length: DEFAULT_SETS_PER_ADDED_EXERCISE },
            (_, index): SetLog => ({
              id: crypto.randomUUID(),
              workoutLogId: current.id,
              exerciseId: ex.exerciseId,
              setNumber: index + 1,
              weight: 0,
              reps: 8,
              isCompleted: false,
            }),
          ),
        );
        return {
          ...current,
          exercises: [
            ...current.exercises,
            ...fresh.map((ex) => ({
              exerciseId: ex.exerciseId,
              name: ex.name,
              primaryMuscle: ex.primaryMuscle,
              restSeconds: DEFAULT_REST_SECONDS,
              targetReps: null,
              suggestedWeight: null,
            })),
          ],
          sets: [...current.sets, ...newSets],
        };
      });
    },
    [mutateSession],
  );

  const completeWorkout = useCallback(
    async (notes?: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const prev = previousRef.current;
      const payload = { completedAt: Date.now(), notes: notes ?? current.notes };
      try {
        if (navigator.onLine) {
          await persist(current, prev, true);
          await api(`/api/sessions/${current.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          // Offline: PUT in die Queue legen (enthält die Sätze), dann PATCH.
          // Erst danach die lokale Kopie löschen – sonst gehen Sätze verloren.
          await enqueueRequest("PUT", `/api/sessions/${current.id}/sets`, {
            sets: toSetPayload(current.sets),
          });
          await enqueueRequest("PATCH", `/api/sessions/${current.id}`, payload);
        }
        await clearLocalSession(current.id);
      } catch {
        await enqueueRequest("PATCH", `/api/sessions/${current.id}`, payload);
        toast.message("Workout lokal gespeichert, Sync folgt online.");
      }
    },
    [persist],
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

  /** Index der ersten Übung mit offenen Sätzen, oder -1 wenn alles erledigt ist. */
  const currentIndex = useMemo(
    () => grouped.findIndex((group) => group.sets.some((set) => !set.isCompleted)),
    [grouped],
  );

  const totals = useMemo(() => {
    const sets = session?.sets ?? [];
    const completed = sets.filter((set) => set.isCompleted);
    return {
      totalSets: sets.length,
      completedSets: completed.length,
      volumeKg: completed.reduce((sum, set) => sum + set.weight * set.reps, 0),
    };
  }, [session]);

  return {
    session,
    previous,
    grouped,
    currentIndex,
    totals,
    rest,
    offline: !online,
    loadFailed,
    updateSet,
    toggleSet,
    addSet,
    removeSet,
    addExercises,
    removeExercise,
    replaceExercise,
    completeWorkout,
    stopRest,
    extendRest,
  };
}
