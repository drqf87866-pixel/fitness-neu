import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kgToDisplay, unitLabel } from "@/lib/units";
import type { PreviousSet, Unit } from "@shared/types";

type Props = {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  unit: Unit;
  previous?: PreviousSet;
  onChange: (patch: { weight?: number; reps?: number }) => void;
  onToggle: () => void;
};

export function SetRow({
  setNumber,
  weight,
  reps,
  isCompleted,
  unit,
  previous,
  onChange,
  onToggle,
}: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-xl px-2 py-2",
        isCompleted ? "bg-emerald-500/10" : "bg-muted",
      )}
    >
      <span className="text-center text-sm font-semibold text-muted-foreground">{setNumber}</span>
      <div>
        <Input
          inputMode="decimal"
          type="number"
          step="0.5"
          value={Number.isFinite(weight) ? kgToDisplay(weight, unit) : 0}
          onChange={(e) => onChange({ weight: Number(e.target.value) })}
          className="h-12 bg-background text-center text-xl tabular-nums"
          aria-label={`Gewicht Satz ${setNumber}`}
        />
        {previous ? (
          <p className="mt-0.5 text-center text-[11px] text-muted-foreground">
            zuletzt {kgToDisplay(previous.weight, unit)} {unitLabel(unit)}
          </p>
        ) : null}
      </div>
      <div>
        <Input
          inputMode="numeric"
          type="number"
          value={reps}
          onChange={(e) => onChange({ reps: Number(e.target.value) })}
          className="h-12 bg-background text-center text-xl tabular-nums"
          aria-label={`Wiederholungen Satz ${setNumber}`}
        />
        {previous ? (
          <p className="mt-0.5 text-center text-[11px] text-muted-foreground">zuletzt {previous.reps} Wdh.</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-12 w-11 items-center justify-center rounded-lg border",
          isCompleted ? "border-emerald-400 bg-emerald-500 text-black" : "border-border bg-background",
        )}
        aria-label={isCompleted ? "Satz offen" : "Satz erledigt"}
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}
