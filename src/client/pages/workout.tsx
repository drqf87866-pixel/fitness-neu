import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Pause } from "lucide-react";
import { SetRow } from "@/components/set-row";
import { RestTimer } from "@/components/rest-timer";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { useAuthQuery } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { toast } from "sonner";

export function WorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const workout = useActiveWorkout(id, unit);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(workout.session?.notes ?? "");
  }, [workout.session?.id]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const totalSets = useMemo(
    () => workout.session?.sets.length ?? 0,
    [workout.session],
  );
  const completedSets = useMemo(
    () => workout.session?.sets.filter((s) => s.isCompleted).length ?? 0,
    [workout.session],
  );
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  if (!workout.session) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Session wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-28">
      {/* Fortschritt */}
      <div>
        <p className="text-xs uppercase tracking-wide text-orange-400">Live-Training</p>
        <h2 className="text-2xl font-semibold">
          {workout.session.planTitle ?? "Freies Training"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Übung {workout.grouped.findIndex((g) => g.sets.some((s) => !s.isCompleted)) + 1} von{" "}
          {workout.grouped.length} · {completedSets} von {totalSets} Sätzen
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {workout.offline ? (
          <p className="mt-1 text-xs text-amber-300">
            Offline – Änderungen werden lokal gespeichert
          </p>
        ) : null}
      </div>

      {/* Übungen */}
      {workout.grouped.map((group, gi) => {
        const groupCompleted = group.sets.every((s) => s.isCompleted);
        const isCurrent = gi === workout.grouped.findIndex((g) => g.sets.some((s) => !s.isCompleted));
        return (
          <Card
            key={group.exerciseId}
            className={cn(
              "grid gap-2 transition-opacity",
              !isCurrent && groupCompleted && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                {(() => {
                  const thumb = getExerciseThumbnail(group.exerciseId);
                  return thumb ? (
                    <img
                      src={thumb}
                      alt={group.name}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null;
                })()}
                <div>
                <CardTitle>{group.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {muscleLabel(group.primaryMuscle)}
                  {group.targetReps
                    ? ` · Ziel ${group.sets.length} × ${group.targetReps}`
                    : ""}
                  {group.suggestedWeight
                    ? ` · Start ${kgToDisplay(group.suggestedWeight, unit)} ${unitLabel(unit)}`
                    : ""}
                </p>
              </div>
            </div>
            {groupCompleted ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : null}
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] px-2 text-[11px] text-muted-foreground">
              <span>#</span>
              <span className="text-center">
                Gewicht ({unitLabel(unit)})
              </span>
              <span className="text-center">Wdh.</span>
              <span />
            </div>
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
          </Card>
        );
      })}

      {/* Notizen */}
      <Card className="grid gap-2">
        <CardTitle>Notizen</CardTitle>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Wie hat das Training sich angefühlt?"
          className="min-h-20"
        />
      </Card>

      {/* Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={() => {
              if (
                completedSets < totalSets &&
                !window.confirm(
                  "Nicht alle Sätze sind abgeschlossen. Trotzdem beenden?",
                )
              )
                return;
              void (async () => {
                await workout.completeWorkout(notes);
                await queryClient.invalidateQueries({
                  queryKey: ["dashboard-stats"],
                });
                toast.success("Workout gespeichert");
                navigate("/history");
              })();
            }}
          >
            <Pause className="h-4 w-4" />
            Beenden
          </Button>
        </div>
      </div>

      {/* Rest-Timer */}
      <RestTimer
        seconds={workout.rest.seconds}
        running={workout.rest.running}
        onDone={workout.stopRest}
        onSkip={workout.stopRest}
      />
    </div>
  );
}
