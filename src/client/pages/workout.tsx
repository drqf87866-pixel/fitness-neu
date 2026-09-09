import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Flag, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ExercisePicker } from "@/components/exercise-picker";
import { RestTimer } from "@/components/rest-timer";
import { SetRow } from "@/components/set-row";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm";
import { MAX_SETS_PER_EXERCISE, useActiveWorkout } from "@/hooks/use-active-workout";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useAuthQuery } from "@/lib/auth";
import { muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { cn, formatDuration, formatStopwatch } from "@/lib/utils";

export function WorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const workout = useActiveWorkout(id, unit);

  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Manuell aufgeklappte Übung; `null` folgt automatisch dem Trainingsfortschritt. */
  const [manualOpen, setManualOpen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);

  const session = workout.session;
  const { grouped, currentIndex, totals } = workout;

  // Display anlassen, solange das Training läuft.
  useWakeLock(Boolean(session) && !session?.completedAt);

  useEffect(() => {
    setNotes(session?.notes ?? "");
  }, [session?.id]);

  // Abgeschlossene Trainings gehören in die schreibgeschützte Detailansicht.
  // Sonst würde jede Eingabe hier am 409 des Servers scheitern.
  useEffect(() => {
    if (session?.completedAt) navigate(`/sessions/${session.id}`, { replace: true });
  }, [session?.completedAt, session?.id, navigate]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    void Notification.requestPermission();
  }, []);

  // Mitlaufende Trainingsdauer
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeId = useMemo(() => {
    if (manualOpen && grouped.some((group) => group.exerciseId === manualOpen)) return manualOpen;
    if (currentIndex >= 0) return grouped[currentIndex]?.exerciseId ?? null;
    return null;
  }, [manualOpen, grouped, currentIndex]);

  // Beim Wechsel der aktiven Übung dorthin scrollen, statt den Nutzer suchen zu lassen.
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeId) return;
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeId]);

  if (!session) {
    return (
      <div className="grid gap-3 pt-safe">
        {workout.loadFailed ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-sm text-muted-foreground">Training konnte nicht geladen werden.</p>
            <Button variant="secondary" onClick={() => navigate("/")}>
              Zurück zum Start
            </Button>
          </div>
        ) : (
          <>
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          </>
        )}
      </div>
    );
  }

  const progress = totals.totalSets > 0 ? (totals.completedSets / totals.totalSets) * 100 : 0;
  const allDone = currentIndex === -1 && totals.totalSets > 0;
  const positionLabel = allDone
    ? "Alle Übungen erledigt"
    : `Übung ${Math.max(1, currentIndex + 1)} von ${grouped.length}`;

  async function finish() {
    const open = totals.totalSets - totals.completedSets;
    const ok = await confirm({
      title: "Training beenden?",
      description: (
        <div className="grid gap-1">
          <p>
            {totals.completedSets} von {totals.totalSets} Sätzen ·{" "}
            {Math.round(kgToDisplay(totals.volumeKg, unit)).toLocaleString("de-DE")}{" "}
            {unitLabel(unit)} Volumen · {formatDuration(now - session!.startedAt)}
          </p>
          {open > 0 ? (
            <p className="text-amber-300">
              {open} Satz{open !== 1 ? "" : ""} noch offen – wird als nicht ausgeführt gespeichert.
            </p>
          ) : null}
        </div>
      ),
      confirmLabel: "Beenden und speichern",
      cancelLabel: "Weiter trainieren",
    });
    if (!ok) return;

    setFinishing(true);
    try {
      await workout.completeWorkout(notes);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["session-open"] }),
        queryClient.invalidateQueries({ queryKey: ["prs"] }),
        queryClient.invalidateQueries({ queryKey: ["volume"] }),
      ]);
      toast.success("Workout gespeichert");
      navigate(`/sessions/${session!.id}`, { replace: true });
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="pb-44">
      {/* Kopf: bleibt beim Scrollen sichtbar, damit Fortschritt und Dauer immer lesbar sind */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pt-safe pb-3 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-orange-400 uppercase">Live-Training</p>
            <h1 className="truncate text-xl font-semibold">
              {session.planTitle ?? "Freies Training"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold tabular-nums" aria-label="Trainingsdauer">
              {formatStopwatch(now - session.startedAt)}
            </span>
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Training verlassen (wird lokal gespeichert)"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {positionLabel} · {totals.completedSets} von {totals.totalSets} Sätzen
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 pt-4">
        {grouped.length === 0 ? (
          <Card className="grid gap-3 py-8 text-center">
            <CardTitle>Noch keine Übungen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Füge deine erste Übung hinzu, um mit dem Protokollieren zu starten.
            </p>
            <Button className="mt-1" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Übung hinzufügen
            </Button>
          </Card>
        ) : null}

        {grouped.map((group, index) => {
          const isActive = group.exerciseId === activeId;
          const done = group.sets.filter((set) => set.isCompleted).length;
          const groupCompleted = group.sets.length > 0 && done === group.sets.length;
          const thumb = getExerciseThumbnail(group.exerciseId);

          return (
            <Card
              key={group.exerciseId}
              ref={isActive ? activeRef : undefined}
              className={cn(
                "scroll-mt-32 gap-3 transition-colors",
                isActive ? "grid border-orange-500/40" : "block",
              )}
            >
              {/* Kopfzeile ist zugleich der Auf-/Zuklapp-Schalter */}
              <button
                type="button"
                onClick={() => setManualOpen(isActive ? null : group.exerciseId)}
                aria-expanded={isActive}
                className="flex w-full items-center gap-3 text-left"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className={cn(
                      "shrink-0 rounded-lg object-cover transition-all",
                      isActive ? "h-12 w-12" : "h-10 w-10",
                    )}
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{group.name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">
                    {muscleLabel(group.primaryMuscle)}
                    {group.targetReps ? ` · Ziel ${group.sets.length} × ${group.targetReps}` : ""}
                    {group.suggestedWeight
                      ? ` · Start ${kgToDisplay(group.suggestedWeight, unit)} ${unitLabel(unit)}`
                      : ""}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  {groupCompleted ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {done}/{group.sets.length}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isActive && "rotate-180",
                    )}
                  />
                </span>
              </button>

              {isActive ? (
                <>
                  <div className="grid gap-2">
                    {group.sets.map((set) => (
                      <SetRow
                        key={set.id}
                        setNumber={set.setNumber}
                        weight={set.weight}
                        reps={set.reps}
                        isCompleted={set.isCompleted}
                        unit={unit}
                        previous={workout.previous.find(
                          (item) =>
                            item.exerciseId === set.exerciseId &&
                            item.setNumber === set.setNumber,
                        )}
                        onChange={(patch) =>
                          workout.updateSet(set.id, patch, patch.weight !== undefined)
                        }
                        onToggle={() => workout.toggleSet(set.id)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={group.sets.length >= MAX_SETS_PER_EXERCISE}
                      onClick={() => workout.addSet(group.exerciseId)}
                    >
                      <Plus className="h-4 w-4" />
                      Satz
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 text-muted-foreground"
                      disabled={group.sets.length <= 1}
                      onClick={() => workout.removeSet(group.sets[group.sets.length - 1].id)}
                    >
                      <Minus className="h-4 w-4" />
                      Satz entfernen
                    </Button>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}

        <Card className="grid gap-2">
          <CardTitle>Notizen</CardTitle>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Wie hat sich das Training angefühlt?"
            className="min-h-20"
          />
        </Card>
      </div>

      {/* Eine gemeinsame fixierte Leiste: der Timer sitzt dadurch immer über den
          Aktionen statt sie zu überlappen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 pt-2 pb-safe">
          <RestTimer
            endsAt={workout.rest.endsAt}
            total={workout.rest.total}
            onDone={workout.stopRest}
            onSkip={workout.stopRest}
            onExtend={workout.extendRest}
          />
          <div className="flex items-center gap-2 pb-1">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Übung
            </Button>
            <Button size="lg" className="flex-1" disabled={finishing} onClick={() => void finish()}>
              <Flag className="h-4 w-4" />
              {finishing ? "Speichern…" : "Beenden"}
            </Button>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={grouped.map((group) => group.exerciseId)}
        title="Übung zum Training hinzufügen"
        onConfirm={(exercises) => {
          workout.addExercises(
            exercises.map((exercise) => ({
              exerciseId: exercise.id,
              name: exercise.name,
              primaryMuscle: exercise.primaryMuscle,
            })),
          );
          const first = exercises[0];
          if (first) setManualOpen(first.id);
        }}
      />
    </div>
  );
}
