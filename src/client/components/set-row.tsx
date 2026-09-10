import { Check } from "lucide-react";
import { StepperInput } from "@/components/ui/stepper-input";
import { cn } from "@/lib/utils";
import { kgToDisplay, unitLabel } from "@/lib/units";
import type { PreviousSet, Unit } from "@shared/types";

type Props = {
  setNumber: number;
  /** Immer in kg – die Anzeige rechnet erst beim Rendern um. */
  weight: number;
  reps: number;
  isCompleted: boolean;
  unit: Unit;
  previous?: PreviousSet;
  onChange: (patch: { weight?: number; reps?: number }) => void;
  onToggle: () => void;
};

/** Übliche Scheiben-/Hantelabstufung – 0,5 war für den Alltag zu fein. */
const WEIGHT_STEP = 2.5;
/** Grenzen aus setLogInputSchema (src/shared/schemas.ts) – sonst lehnt der Server ab. */
const MAX_WEIGHT = 1000;
const MAX_REPS = 200;

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
  const displayWeight = Number.isFinite(weight) ? kgToDisplay(weight, unit) : 0;

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-xl p-2 transition-colors",
        isCompleted ? "bg-emerald-500/10" : "bg-muted",
      )}
    >
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-baseline gap-2 px-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Satz {setNumber}</span>
          {previous ? (
            <span className="line-clamp-1 wrap-anywhere text-[11px] text-muted-foreground">
              zuletzt {kgToDisplay(previous.weight, unit)} {unitLabel(unit)} × {previous.reps}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StepperInput
            value={displayWeight}
            onCommit={(next) => onChange({ weight: next })}
            step={WEIGHT_STEP}
            decimals={1}
            max={MAX_WEIGHT}
            ariaLabel={`Gewicht Satz ${setNumber} in ${unitLabel(unit)}`}
          />
          <StepperInput
            value={reps}
            onCommit={(next) => onChange({ reps: next })}
            step={1}
            max={MAX_REPS}
            ariaLabel={`Wiederholungen Satz ${setNumber}`}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isCompleted}
        aria-label={isCompleted ? `Satz ${setNumber} wieder öffnen` : `Satz ${setNumber} erledigt`}
        className={cn(
          "flex w-12 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCompleted
            ? "border-emerald-400 bg-emerald-500 text-black"
            : "border-border bg-background text-muted-foreground active:bg-muted",
        )}
      >
        <Check className="h-5 w-5" />
      </button>
    </div>
  );
}
