import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExercisePicker } from "@/components/exercise-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepperInput } from "@/components/ui/stepper-input";
import { Sheet } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import type { Exercise, WorkoutPlan } from "@shared/types";

type DraftItem = {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  targetSets: number;
  targetReps: string;
};

/** Dieselbe Seite erstellt und bearbeitet Pläne – der Übungs-Picker ist ein
 *  Sheet und ließe sich in einem Dialog nicht sauber verschachteln. */
export function CreatePlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { planId } = useParams();
  const isEdit = Boolean(planId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [altTarget, setAltTarget] = useState<{ exerciseId: string; name: string } | null>(null);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: WorkoutPlan[] }>("/api/plans"),
    enabled: isEdit,
  });
  const existing = plans.data?.plans.find((plan) => plan.id === planId) ?? null;

  // Formular einmalig aus dem geladenen Plan befüllen, danach gewinnt die Eingabe.
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setTitle(existing.title);
    setDescription(existing.description ?? "");
    setItems(
      [...existing.exercises]
        .sort((a, b) => a.order - b.order)
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          name: exercise.exerciseName,
          primaryMuscle: exercise.primaryMuscle,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
        })),
    );
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  function updateItem(exerciseId: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.exerciseId === exerciseId ? { ...item, ...patch } : item)),
    );
  }

  const alternatives = useMutation({
    mutationFn: (exerciseId: string) =>
      api<{ alternatives: Exercise[]; usedFallback: boolean }>("/api/ai/alternatives", {
        method: "POST",
        body: JSON.stringify({ exerciseId }),
      }),
    onError: (error) => toast.error(error.message),
  });

  function openAlternatives(item: DraftItem) {
    setAltTarget({ exerciseId: item.exerciseId, name: item.name });
    alternatives.mutate(item.exerciseId);
  }

  function applyAlternative(exercise: Exercise) {
    if (!altTarget) return;
    updateItem(altTarget.exerciseId, {
      exerciseId: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
    });
    setAltTarget(null);
    toast.success(`Übung durch „${exercise.name}“ ersetzt`);
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const save = useMutation({
    mutationFn: () =>
      api<{ plan: WorkoutPlan }>(isEdit ? `/api/plans/${planId}` : "/api/plans", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          exercises: items.map((item, index) => ({
            exerciseId: item.exerciseId,
            targetSets: item.targetSets,
            targetReps: item.targetReps,
            order: index,
          })),
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(isEdit ? "Plan gespeichert" : "Plan erstellt");
      navigate("/plans");
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave =
    title.trim().length > 0 &&
    items.length > 0 &&
    items.every(
      (item) =>
        item.targetReps.trim().length > 0 && item.targetSets >= 1 && item.targetSets <= 20,
    ) &&
    !save.isPending;

  return (
    <div className="grid gap-4 pb-24">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => navigate("/plans")}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">{isEdit ? "Plan bearbeiten" : "Plan erstellen"}</h2>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="plan-title">Name</Label>
          <Input
            id="plan-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Oberkörper Kraft"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="plan-description">Beschreibung (optional)</Label>
          <Textarea
            id="plan-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Kurze Beschreibung des Ziels"
            className="min-h-16"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Übungen {items.length > 0 ? `(${items.length})` : ""}</Label>
          {items.length > 0 ? (
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Hinzufügen
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <Card className="grid gap-3 py-8 text-center">
            <CardTitle>Noch keine Übungen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Suche im Katalog und stelle deinen Plan zusammen.
            </p>
            <Button className="mt-1" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Übungen auswählen
            </Button>
          </Card>
        ) : (
          items.map((item, index) => {
            const thumb = getExerciseThumbnail(item.exerciseId);
            return (
              <Card key={item.exerciseId} compact className="grid gap-3">
                <div className="flex items-center gap-2">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {index + 1}. {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {muscleLabel(item.primaryMuscle)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
                      onClick={() => openAlternatives(item)}
                      aria-label={`Vergleichbare Übungen zu ${item.name} vorschlagen`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label={`${item.name} nach oben`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`${item.name} nach unten`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((entry) => entry.exerciseId !== item.exerciseId),
                        )
                      }
                      aria-label={`${item.name} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Sätze</Label>
                    <StepperInput
                      value={item.targetSets}
                      onCommit={(next) => updateItem(item.exerciseId, { targetSets: next })}
                      min={1}
                      max={20}
                      ariaLabel={`Sätze für ${item.name}`}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs" htmlFor={`reps-${item.exerciseId}`}>
                      Wiederholungen
                    </Label>
                    <Input
                      id={`reps-${item.exerciseId}`}
                      value={item.targetReps}
                      placeholder="8-12"
                      className="h-11"
                      onChange={(event) =>
                        updateItem(item.exerciseId, { targetReps: event.target.value })
                      }
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Button
        size="lg"
        disabled={!canSave}
        className="w-full"
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Speichern…" : isEdit ? "Plan speichern" : "Plan erstellen"}
      </Button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={items.map((item) => item.exerciseId)}
        onConfirm={(exercises) =>
          setItems((current) => [
            ...current,
            ...exercises.map((exercise) => ({
              exerciseId: exercise.id,
              name: exercise.name,
              primaryMuscle: exercise.primaryMuscle,
              targetSets: 3,
              targetReps: "8-12",
            })),
          ])
        }
      />

      <Sheet
        open={altTarget !== null}
        onClose={() => setAltTarget(null)}
        title="Vergleichbare Übungen"
        description={altTarget ? `Alternativen zu „${altTarget.name}“` : undefined}
      >
        {alternatives.isPending ? (
          <div className="grid gap-2 py-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !alternatives.data || alternatives.data.alternatives.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Keine vergleichbaren Übungen im Katalog gefunden.
          </p>
        ) : (
          <div className="grid gap-1.5 pb-4">
            {alternatives.data.usedFallback ? (
              <Badge variant="outline" className="w-fit">
                Ohne KI ermittelt
              </Badge>
            ) : null}
            {alternatives.data.alternatives.map((exercise) => {
              const alreadyInPlan = items.some(
                (item) => item.exerciseId === exercise.id && item.exerciseId !== altTarget?.exerciseId,
              );
              const thumb = getExerciseThumbnail(exercise.id);
              return (
                <button
                  key={exercise.id}
                  type="button"
                  disabled={alreadyInPlan}
                  onClick={() => applyAlternative(exercise)}
                  className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card p-2 text-left transition-colors disabled:opacity-45 enabled:active:bg-muted"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{exercise.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {muscleLabel(exercise.primaryMuscle)}
                      {alreadyInPlan ? " · bereits im Plan" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </div>
  );
}
