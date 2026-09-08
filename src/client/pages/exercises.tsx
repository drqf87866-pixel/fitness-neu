import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { CATEGORY_LABELS, MUSCLE_LABELS, EQUIPMENT_TAGS, MOVEMENT_TAGS, muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import type { Exercise, ExerciseCategory } from "@shared/types";
import { toast } from "sonner";

function parseSecondary(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ExercisesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("other");
  const [primaryMuscle, setPrimaryMuscle] = useState("chest");
  const [secondaryMuscles, setSecondaryMuscles] = useState("");
  const [equipment, setEquipment] = useState("dumbbell");

  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("all");

  const list = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api<{ exercises: Exercise[] }>("/api/exercises"),
  });

  const allExercises = list.data?.exercises ?? [];
  const filtered = allExercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = filterMuscle === "all" || ex.primaryMuscle === filterMuscle;
    const matchCategory = filterCategory === "all" || ex.category === filterCategory;
    const matchEquipment = filterEquipment === "all" || ex.equipment === filterEquipment;
    return matchSearch && matchMuscle && matchCategory && matchEquipment;
  });

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory("other");
    setPrimaryMuscle("chest");
    setSecondaryMuscles("");
    setEquipment("dumbbell");
    setOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise);
    setName(exercise.name);
    setCategory(exercise.category as ExerciseCategory);
    setPrimaryMuscle(exercise.primaryMuscle);
    setSecondaryMuscles(exercise.secondaryMuscles.join(", "));
    setEquipment(exercise.equipment);
    setOpen(true);
  }

  const body = JSON.stringify({
    name,
    category,
    primaryMuscle,
    secondaryMuscles: parseSecondary(secondaryMuscles),
    equipment,
  });

  const create = useMutation({
    mutationFn: () => api("/api/exercises", { method: "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setOpen(false);
      toast.success("Übung angelegt");
    },
    onError: (error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: () =>
      api(`/api/exercises/${editing!.id}`, { method: "PATCH", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setOpen(false);
      toast.success("Übung aktualisiert");
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/exercises/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exercises"] }),
  });

  const pending = create.isPending || update.isPending;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Übungen</h2>
        <Button onClick={openCreate}>Eigene Übung</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          placeholder="Übung suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-10 rounded-lg border border-input bg-muted px-3"
          value={filterMuscle}
          onChange={(e) => setFilterMuscle(e.target.value)}
        >
          <option value="all">Alle Muskeln</option>
          {Object.entries(MUSCLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-input bg-muted px-3"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">Alle Kategorien</option>
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-input bg-muted px-3"
          value={filterEquipment}
          onChange={(e) => setFilterEquipment(e.target.value)}
        >
          <option value="all">Alle Geräte</option>
          {Object.entries(EQUIPMENT_TAGS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} Übungen</p>
      {filtered.map((exercise) => {
        const thumb = getExerciseThumbnail(exercise.id);
        return (
        <Card key={exercise.id} className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            {thumb ? (
              <div className="shrink-0">
                <img
                  src={thumb}
                  alt={exercise.name}
                  className="h-16 w-16 rounded-lg object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div>
              <CardTitle>{exercise.name}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline">{muscleLabel(exercise.primaryMuscle)}</Badge>
                <Badge variant="outline">{EQUIPMENT_TAGS[exercise.equipment] ?? exercise.equipment}</Badge>
                <Badge variant="outline">{MOVEMENT_TAGS[exercise.category] ?? exercise.category}</Badge>
                {exercise.isCustom ? <Badge>Custom</Badge> : null}
              </div>
            </div>
          </div>
          {exercise.isCustom ? (
            <div className="flex flex-col gap-1">
              <Button variant="outline" onClick={() => openEdit(exercise)}>
                Bearbeiten
              </Button>
              <Button variant="ghost" onClick={() => remove.mutate(exercise.id)}>
                Löschen
              </Button>
            </div>
          ) : null}
        </Card>
      );
      })}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Übung bearbeiten" : "Eigene Übung"}
      >
        <div className="grid gap-3">
          <Field>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <Label>Kategorie</Label>
            <select
              className="h-10 rounded-lg border border-input bg-muted px-3"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Muskelgruppe</Label>
            <select
              className="h-10 rounded-lg border border-input bg-muted px-3"
              value={primaryMuscle}
              onChange={(e) => setPrimaryMuscle(e.target.value)}
            >
              {Object.entries(MUSCLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Weitere Muskeln (Komma-getrennt)</Label>
            <Input
              value={secondaryMuscles}
              placeholder="triceps, shoulders"
              onChange={(e) => setSecondaryMuscles(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Equipment</Label>
            <select
              className="h-10 rounded-lg border border-input bg-muted px-3"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              <option value="barbell">Langhantel</option>
              <option value="dumbbell">Kurzhantel</option>
              <option value="bodyweight">Körpergewicht</option>
              <option value="machine">Maschine</option>
              <option value="cable">Kabelzug</option>
              <option value="other">Sonstiges</option>
            </select>
          </Field>
          <Button
            disabled={pending || !name.trim()}
            onClick={() => (editing ? update.mutate() : create.mutate())}
          >
            {pending ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
