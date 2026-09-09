import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import {
  CATEGORY_LABELS,
  EQUIPMENT_TAGS,
  MOVEMENT_TAGS,
  MUSCLE_LABELS,
  muscleLabel,
} from "@/lib/labels";
import { getExerciseImage, getExerciseThumbnail } from "@/lib/exercise-images";
import type { Exercise, ExerciseCategory } from "@shared/types";

const PAGE_SIZE = 30;

function parseSecondary(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ExercisesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [detail, setDetail] = useState<Exercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("other");
  const [primaryMuscle, setPrimaryMuscle] = useState("chest");
  const [secondaryMuscles, setSecondaryMuscles] = useState("");
  const [equipment, setEquipment] = useState("dumbbell");

  const list = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api<{ exercises: Exercise[] }>("/api/exercises"),
  });

  const catalog = useMemo(() => list.data?.exercises ?? [], [list.data]);

  const muscles = useMemo(() => {
    const seen = new Set(catalog.map((exercise) => exercise.primaryMuscle));
    return [...seen].sort((a, b) => muscleLabel(a).localeCompare(muscleLabel(b), "de"));
  }, [catalog]);

  const equipmentKeys = useMemo(
    () => [...new Set(catalog.map((exercise) => exercise.equipment))].sort(),
    [catalog],
  );

  const categoryKeys = useMemo(
    () =>
      [...new Set(catalog.map((exercise) => exercise.category))].sort((a, b) =>
        (MOVEMENT_TAGS[a] ?? a).localeCompare(MOVEMENT_TAGS[b] ?? b, "de"),
      ),
    [catalog],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return catalog.filter((exercise) => {
      if (needle && !exercise.name.toLowerCase().includes(needle)) return false;
      if (muscleFilter && exercise.primaryMuscle !== muscleFilter) return false;
      if (equipmentFilter && exercise.equipment !== equipmentFilter) return false;
      if (categoryFilter && exercise.category !== categoryFilter) return false;
      return true;
    });
  }, [catalog, search, muscleFilter, equipmentFilter, categoryFilter]);

  const shown = filtered.slice(0, visible);

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory("other");
    setPrimaryMuscle("chest");
    setSecondaryMuscles("");
    setEquipment("dumbbell");
    setFormOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setDetail(null);
    setEditing(exercise);
    setName(exercise.name);
    setCategory(exercise.category as ExerciseCategory);
    setPrimaryMuscle(exercise.primaryMuscle);
    setSecondaryMuscles(exercise.secondaryMuscles.join(", "));
    setEquipment(exercise.equipment);
    setFormOpen(true);
  }

  const body = () =>
    JSON.stringify({
      name: name.trim(),
      category,
      primaryMuscle,
      secondaryMuscles: parseSecondary(secondaryMuscles),
      equipment,
    });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api(`/api/exercises/${editing.id}`, { method: "PATCH", body: body() })
        : api("/api/exercises", { method: "POST", body: body() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setFormOpen(false);
      toast.success(editing ? "Übung aktualisiert" : "Übung angelegt");
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/exercises/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setDetail(null);
      toast.success("Übung gelöscht");
    },
    onError: (error) => toast.error(error.message),
  });

  async function confirmDelete(exercise: Exercise) {
    const ok = await confirm({
      title: "Übung löschen?",
      description: `„${exercise.name}" wird aus deinem Katalog entfernt.`,
      confirmLabel: "Löschen",
      destructive: true,
    });
    if (ok) remove.mutate(exercise.id);
  }

  const detailImages = detail ? getExerciseImage(detail.id) : null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
          onClick={() => navigate("/plans")}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-xl font-semibold">Übungen</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Eigene
        </Button>
      </div>

      {/* Eine Suchzeile plus drei Chip-Leisten statt vier gestapelter Selects,
          die auf dem Handy den halben Viewport belegt haben. */}
      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Übung suchen…"
            aria-label="Übung suchen"
            className="h-11 w-full rounded-lg border border-input bg-muted pr-10 pl-9 text-base outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Suche zurücksetzen"
              className="absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="scroll-x flex gap-1.5 pb-1">
          <Chip active={muscleFilter === null} onClick={() => setMuscleFilter(null)}>
            Alle Muskeln
          </Chip>
          {muscles.map((key) => (
            <Chip
              key={key}
              active={muscleFilter === key}
              onClick={() => {
                setMuscleFilter(muscleFilter === key ? null : key);
                setVisible(PAGE_SIZE);
              }}
            >
              {muscleLabel(key)}
            </Chip>
          ))}
        </div>
        <div className="scroll-x flex gap-1.5 pb-1">
          <Chip active={equipmentFilter === null} onClick={() => setEquipmentFilter(null)}>
            Alle Geräte
          </Chip>
          {equipmentKeys.map((key) => (
            <Chip
              key={key}
              active={equipmentFilter === key}
              onClick={() => {
                setEquipmentFilter(equipmentFilter === key ? null : key);
                setVisible(PAGE_SIZE);
              }}
            >
              {EQUIPMENT_TAGS[key] ?? key}
            </Chip>
          ))}
        </div>
        <div className="scroll-x flex gap-1.5 pb-1">
          <Chip active={categoryFilter === null} onClick={() => setCategoryFilter(null)}>
            Alle Kategorien
          </Chip>
          {categoryKeys.map((key) => (
            <Chip
              key={key}
              active={categoryFilter === key}
              onClick={() => {
                setCategoryFilter(categoryFilter === key ? null : key);
                setVisible(PAGE_SIZE);
              }}
            >
              {MOVEMENT_TAGS[key] ?? key}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} Übung{filtered.length !== 1 ? "en" : ""}
      </p>

      <div className="grid gap-2">
        {shown.map((exercise) => {
          const thumb = getExerciseThumbnail(exercise.id);
          return (
            <Card key={exercise.id} compact className="p-0">
              <button
                type="button"
                onClick={() => setDetail(exercise)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{exercise.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{muscleLabel(exercise.primaryMuscle)}</Badge>
                    <Badge variant="outline">
                      {EQUIPMENT_TAGS[exercise.equipment] ?? exercise.equipment}
                    </Badge>
                    {exercise.isCustom ? <Badge>Eigene</Badge> : null}
                  </div>
                </div>
              </button>
            </Card>
          );
        })}

        {filtered.length === 0 && !list.isLoading ? (
          <Card compact className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Keine Übung gefunden. Andere Suche oder Filter versuchen.
            </p>
          </Card>
        ) : null}

        {filtered.length > shown.length ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            Weitere {Math.min(PAGE_SIZE, filtered.length - shown.length)} anzeigen
          </Button>
        ) : null}
      </div>

      {/* Detailansicht: die zweiten Bilder aus public/exercises/ waren bisher
          nirgends erreichbar, ebenso wenig die sekundären Muskeln. */}
      <Sheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        footer={
          detail?.isCustom ? (
            <div className="grid gap-2">
              <Button size="lg" variant="secondary" onClick={() => detail && openEdit(detail)}>
                Bearbeiten
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-red-400"
                disabled={remove.isPending}
                onClick={() => detail && void confirmDelete(detail)}
              >
                Löschen
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="grid gap-3 pb-2">
            {detailImages ? (
              <div className="grid grid-cols-2 gap-2">
                <img
                  src={detailImages.src0}
                  alt={`${detail.name}, Startposition`}
                  className="h-44 w-full rounded-lg bg-muted object-cover"
                />
                <img
                  src={detailImages.src1}
                  alt={`${detail.name}, Endposition`}
                  className="h-44 w-full rounded-lg bg-muted object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                Kein Bild verfügbar
              </div>
            )}
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Hauptmuskel</dt>
                <dd className="text-right">{muscleLabel(detail.primaryMuscle)}</dd>
              </div>
              {detail.secondaryMuscles.length > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Weitere Muskeln</dt>
                  <dd className="text-right">
                    {detail.secondaryMuscles.map((key) => muscleLabel(key)).join(", ")}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Equipment</dt>
                <dd className="text-right">
                  {EQUIPMENT_TAGS[detail.equipment] ?? detail.equipment}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Bewegung</dt>
                <dd className="text-right">
                  {MOVEMENT_TAGS[detail.category] ?? detail.category}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Übung bearbeiten" : "Eigene Übung"}
        footer={
          <Button
            size="lg"
            className="w-full"
            disabled={save.isPending || !name.trim()}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Speichern…" : "Speichern"}
          </Button>
        }
      >
        <div className="grid gap-3 pb-2">
          <Field>
            <Label htmlFor="ex-name">Name</Label>
            <Input
              id="ex-name"
              className="h-11"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="ex-category">Kategorie</Label>
            <select
              id="ex-category"
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExerciseCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label htmlFor="ex-muscle">Muskelgruppe</Label>
            <select
              id="ex-muscle"
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={primaryMuscle}
              onChange={(event) => setPrimaryMuscle(event.target.value)}
            >
              {Object.entries(MUSCLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label htmlFor="ex-secondary">Weitere Muskeln (Komma-getrennt)</Label>
            <Input
              id="ex-secondary"
              className="h-11"
              value={secondaryMuscles}
              placeholder="triceps, shoulders"
              onChange={(event) => setSecondaryMuscles(event.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="ex-equipment">Equipment</Label>
            <select
              id="ex-equipment"
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
            >
              {Object.entries(EQUIPMENT_TAGS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
