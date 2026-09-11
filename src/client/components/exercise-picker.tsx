import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Chip } from "@/components/ui/chip";
import { api } from "@/lib/api";
import { CATEGORY_LABELS, EQUIPMENT_TAGS, muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import { cn, searchKey } from "@/lib/utils";
import type { Exercise } from "@shared/types";

const PAGE_SIZE = 40;

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (exercises: Exercise[]) => void;
  /** Bereits im Plan/Training enthaltene Übungen – werden ausgegraut. */
  existingIds?: string[];
  title?: string;
};

/**
 * Durchsuchbare Übungsauswahl als Bottom-Sheet.
 *
 * Ersetzt die früheren ungefilterten Listen über den kompletten Katalog
 * und das Auswahl-`select` im Plan-Editor.
 */
export function ExercisePicker({
  open,
  onClose,
  onConfirm,
  existingIds = [],
  title = "Übungen hinzufügen",
}: Props) {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const list = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api<{ exercises: Exercise[] }>("/api/exercises"),
    enabled: open,
  });

  const catalog = useMemo(() => list.data?.exercises ?? [], [list.data]);
  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  // Jede Öffnung startet mit leerer Auswahl und zurückgesetzten Filtern.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setMuscle(null);
    setEquipment(null);
    setCategory(null);
    setPicked([]);
    setVisible(PAGE_SIZE);
  }, [open]);

  // Nach jeder Filteränderung wieder oben in der Liste anfangen.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, muscle, equipment, category]);

  const muscles = useMemo(() => {
    const seen = new Set(catalog.map((exercise) => exercise.primaryMuscle));
    return [...seen].sort((a, b) => muscleLabel(a).localeCompare(muscleLabel(b), "de"));
  }, [catalog]);

  const equipmentKeys = useMemo(() => {
    const seen = new Set(catalog.map((exercise) => exercise.equipment));
    return [...seen].sort();
  }, [catalog]);

  const categoryKeys = useMemo(() => {
    const seen = new Set(catalog.map((exercise) => exercise.category));
    return [...seen].sort((a, b) =>
      (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b, "de"),
    );
  }, [catalog]);

  const filtered = useMemo(() => {
    const needle = searchKey(search);
    return catalog.filter((exercise) => {
      if (needle && !searchKey(exercise.name).includes(needle)) return false;
      if (muscle && exercise.primaryMuscle !== muscle) return false;
      if (equipment && exercise.equipment !== equipment) return false;
      if (category && exercise.category !== category) return false;
      return true;
    });
  }, [catalog, search, muscle, equipment, category]);

  const shown = filtered.slice(0, visible);

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function confirm() {
    const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
    const chosen = picked
      .map((id) => byId.get(id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));
    onConfirm(chosen);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      full
      footer={
        <Button size="lg" className="w-full" disabled={picked.length === 0} onClick={confirm}>
          {picked.length === 0
            ? "Übungen auswählen"
            : `${picked.length} Übung${picked.length !== 1 ? "en" : ""} übernehmen`}
        </Button>
      }
    >
      <div className="sticky top-0 z-10 -mx-4 bg-card px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

        <div className="scroll-x mt-2 flex gap-1.5 pb-1">
          <Chip active={muscle === null} onClick={() => setMuscle(null)}>
            Alle Muskeln
          </Chip>
          {muscles.map((key) => (
            <Chip key={key} active={muscle === key} onClick={() => setMuscle(key)}>
              {muscleLabel(key)}
            </Chip>
          ))}
        </div>

        <div className="scroll-x mt-1.5 flex gap-1.5 pb-1">
          <Chip active={equipment === null} onClick={() => setEquipment(null)}>
            Alle Geräte
          </Chip>
          {equipmentKeys.map((key) => (
            <Chip key={key} active={equipment === key} onClick={() => setEquipment(key)}>
              {EQUIPMENT_TAGS[key] ?? key}
            </Chip>
          ))}
        </div>

        <div className="scroll-x mt-1.5 flex gap-1.5 pb-1">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            Alle Kategorien
          </Chip>
          {categoryKeys.map((key) => (
            <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
              {CATEGORY_LABELS[key] ?? key}
            </Chip>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <div className="grid gap-2 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Keine Übung gefunden. Andere Suche oder Filter versuchen.
        </p>
      ) : (
        <div className="grid gap-1.5 pb-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length} Übung{filtered.length !== 1 ? "en" : ""}
          </p>
          {shown.map((exercise) => {
            const isPicked = picked.includes(exercise.id);
            const alreadyThere = existing.has(exercise.id);
            const thumb = getExerciseThumbnail(exercise.id);
            return (
              <button
                key={exercise.id}
                type="button"
                disabled={alreadyThere}
                onClick={() => toggle(exercise.id)}
                aria-pressed={isPicked}
                className={cn(
                  "flex min-h-[60px] w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                  isPicked ? "border-orange-500/60 bg-orange-500/10" : "border-border bg-card",
                  alreadyThere && "opacity-45",
                )}
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
                    {muscleLabel(exercise.primaryMuscle)} ·{" "}
                    {EQUIPMENT_TAGS[exercise.equipment] ?? exercise.equipment} ·{" "}
                    {CATEGORY_LABELS[exercise.category] ?? exercise.category}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isPicked ? "bg-orange-500 text-black" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {alreadyThere ? "·" : isPicked ? <Check className="h-4 w-4" /> : "+"}
                </span>
              </button>
            );
          })}
          {filtered.length > shown.length ? (
            <Button
              variant="secondary"
              className="mt-1 w-full"
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
            >
              Weitere {Math.min(PAGE_SIZE, filtered.length - shown.length)} anzeigen
            </Button>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
