import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { muscleLabel, EQUIPMENT_TAGS, MOVEMENT_TAGS } from "@/lib/labels";
import type { Exercise, WorkoutPlan } from "@shared/types";
import { toast } from "sonner";

type DraftItem = {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
};

type EquipmentTag = "Maschine" | "Freihantel" | "Anderes";
type MovementTag = "Push" | "Pull" | "Legs" | "Anderes";

const EQUIPMENT_FILTER_OPTIONS: EquipmentTag[] = ["Maschine", "Freihantel", "Anderes"];
const MOVEMENT_FILTER_OPTIONS: MovementTag[] = ["Push", "Pull", "Legs", "Anderes"];

export function CreatePlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentTag | null>(null);
  const [movementFilter, setMovementFilter] = useState<MovementTag | null>(null);

  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api<{ exercises: Exercise[] }>("/api/exercises"),
  });
  const catalog = exercisesQuery.data?.exercises ?? [];

  const filteredExercises = catalog.filter((exercise) => {
    if (regionFilter && exercise.primaryMuscle !== regionFilter) return false;
    if (equipmentFilter) {
      const tag = EQUIPMENT_TAGS[exercise.equipment] ?? exercise.equipment;
      if (tag !== equipmentFilter) return false;
    }
    if (movementFilter) {
      const tag = MOVEMENT_TAGS[exercise.category] ?? exercise.category;
      if (tag !== movementFilter) return false;
    }
    return true;
  });

  const regions = [...new Set(catalog.map((e) => e.primaryMuscle))].sort();

  function toggleExercise(exerciseId: string) {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.exerciseId === exerciseId);
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      return [
        ...prev,
        { exerciseId, targetSets: 3, targetReps: "8-12" },
      ];
    });
  }

  function updateItem(exerciseId: string, field: "targetSets" | "targetReps", value: number | string) {
    setItems((prev) =>
      prev.map((item) =>
        item.exerciseId === exerciseId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function moveItem(fromIndex: number, direction: -1 | 1) {
    setItems((prev) => {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        exercises: items.map((item, index) => ({ ...item, order: index })),
      });
      return api<{ plan: WorkoutPlan }>("/api/plans", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan erstellt");
      navigate("/plans");
    },
    onError: (error) => toast.error(error.message),
  });

  const canSave =
    title.trim().length > 0 &&
    items.length > 0 &&
    items.every((item) => item.exerciseId && item.targetReps.trim().length > 0) &&
    !save.isPending;

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={() => navigate("/plans")}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold">Plan erstellen</h2>
      </div>

      {/* Name + Beschreibung */}
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Label>Name</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Oberkörper Kraft"
          />
        </div>
        <div className="grid gap-1">
          <Label>Beschreibung (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung des Ziels"
            className="min-h-16"
          />
        </div>
      </div>

      {/* Filter */}
      <Card compact className="grid gap-3">
        <Label>Filter</Label>

        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Körperregion</Label>
          <div className="flex flex-wrap gap-1">
            {regions.map((region) => (
              <Badge
                key={region}
                variant={regionFilter === region ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setRegionFilter(regionFilter === region ? null : region)}
              >
                {muscleLabel(region)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Equipment</Label>
          <div className="flex flex-wrap gap-1">
            {EQUIPMENT_FILTER_OPTIONS.map((tag) => (
              <Badge
                key={tag}
                variant={equipmentFilter === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setEquipmentFilter(equipmentFilter === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Bewegung</Label>
          <div className="flex flex-wrap gap-1">
            {MOVEMENT_FILTER_OPTIONS.map((tag) => (
              <Badge
                key={tag}
                variant={movementFilter === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setMovementFilter(movementFilter === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Übungen */}
      <div className="grid gap-2">
        <Label>Übungen ({filteredExercises.length})</Label>
        {filteredExercises.map((exercise) => {
          const isSelected = items.some((item) => item.exerciseId === exercise.id);
          return (
            <Card
              key={exercise.id}
              compact
              className={`flex cursor-pointer items-center justify-between gap-3 ${
                isSelected ? "border-orange-500/50 bg-orange-500/10" : ""
              }`}
              onClick={() => toggleExercise(exercise.id)}
            >
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm">{exercise.name}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {muscleLabel(exercise.primaryMuscle)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {EQUIPMENT_TAGS[exercise.equipment] ?? exercise.equipment}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {MOVEMENT_TAGS[exercise.category] ?? exercise.category}
                  </Badge>
                </div>
              </div>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  isSelected
                    ? "bg-orange-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isSelected ? "✓" : "+"}
              </div>
            </Card>
          );
        })}
        {filteredExercises.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Keine Übungen für diese Filter.
          </p>
        )}
      </div>

      {/* Ausgewählte Übungen */}
      {items.length > 0 && (
        <div className="grid gap-2">
          <Label>Ausgewählte Übungen ({items.length})</Label>
          {items.map((item, index) => {
            const exercise = catalog.find((e) => e.id === item.exerciseId);
            return (
              <Card key={item.exerciseId} compact className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {index + 1}. {exercise?.name ?? "Unbekannt"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label="Nach oben"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Nach unten"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      onClick={() => toggleExercise(item.exerciseId)}
                      aria-label="Entfernen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Sätze</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={item.targetSets}
                      onChange={(e) =>
                        updateItem(item.exerciseId, "targetSets", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Wiederholungen</Label>
                    <Input
                      value={item.targetReps}
                      placeholder="8-12"
                      onChange={(e) =>
                        updateItem(item.exerciseId, "targetReps", e.target.value)
                      }
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Speichern */}
      <Button disabled={!canSave} className="w-full" onClick={() => save.mutate()}>
        {save.isPending ? "Speichern…" : "Plan erstellen"}
      </Button>
    </div>
  );
}
