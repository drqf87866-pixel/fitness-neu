import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, Field } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Exercise, WorkoutPlan } from "@shared/types";
import { toast } from "sonner";

type DraftItem = {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
};

type Props = {
  open: boolean;
  plan: WorkoutPlan | null;
  onClose: () => void;
};

export function PlanEditor({ open, plan, onClose }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api<{ exercises: Exercise[] }>("/api/exercises"),
    enabled: open,
  });
  const catalog = exercisesQuery.data?.exercises ?? [];

  useEffect(() => {
    if (!open) return;
    setTitle(plan?.title ?? "");
    setDescription(plan?.description ?? "");
    setItems(
      plan?.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
      })) ?? [],
    );
  }, [open, plan]);

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        exercises: items.map((item, index) => ({ ...item, order: index })),
      });
      return plan
        ? api<{ plan: WorkoutPlan }>(`/api/plans/${plan.id}`, {
            method: "PATCH",
            body,
          })
        : api<{ plan: WorkoutPlan }>("/api/plans", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(plan ? "Plan aktualisiert" : "Plan erstellt");
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave =
    title.trim().length > 0 &&
    items.length > 0 &&
    items.every(
      (item) => item.exerciseId && item.targetReps.trim().length > 0,
    ) &&
    !save.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={plan ? "Plan bearbeiten" : "Plan erstellen"}
    >
      <div className="grid gap-4">
        <Field>
          <Label>Name</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Oberkörper Kraft"
          />
        </Field>
        <Field>
          <Label>Beschreibung (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung des Ziels"
            className="min-h-16"
          />
        </Field>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Übungen</Label>
            <Button
              variant="secondary"
              size="sm"
              disabled={!catalog.length}
              onClick={() =>
                setItems([
                  ...items,
                  {
                    exerciseId: catalog[0]?.id ?? "",
                    targetSets: 3,
                    targetReps: "8-12",
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Hinzufügen
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Noch keine Übungen. Füge mindestens eine hinzu.
            </p>
          ) : (
            <div className="grid gap-3">
              {items.map((item, index) => (
                <Card key={index} compact className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Übung {index + 1}
                    </span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== index))
                      }
                      aria-label={`Übung ${index + 1} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    className="h-10 rounded-lg border border-input bg-muted px-3 text-sm"
                    value={item.exerciseId}
                    onChange={(e) =>
                      setItems(
                        items.map((entry, i) =>
                          i === index
                            ? { ...entry, exerciseId: e.target.value }
                            : entry,
                        ),
                      )
                    }
                    aria-label={`Übung ${index + 1} auswählen`}
                  >
                    {catalog.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Field>
                      <Label className="text-xs">Sätze</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={item.targetSets}
                        onChange={(e) =>
                          setItems(
                            items.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    targetSets: Number(e.target.value),
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field>
                      <Label className="text-xs">Wiederholungen</Label>
                      <Input
                        value={item.targetReps}
                        placeholder="8-12"
                        onChange={(e) =>
                          setItems(
                            items.map((entry, i) =>
                              i === index
                                ? { ...entry, targetReps: e.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button
          disabled={!canSave}
          className="w-full"
          onClick={() => save.mutate()}
        >
          {save.isPending
            ? "Speichern…"
            : plan
              ? "Plan speichern"
              : "Plan erstellen"}
        </Button>
      </div>
    </Dialog>
  );
}
