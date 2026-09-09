import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  /** Wird nur bei Blur oder Stepper-Tap gerufen, nicht bei jedem Tastendruck. */
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Nachkommastellen der Anzeige: 0 für Wiederholungen, 1 für Gewicht. */
  decimals?: number;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

function format(value: number, decimals: number) {
  if (!Number.isFinite(value)) return "";
  return decimals > 0 ? String(Math.round(value * 10 ** decimals) / 10 ** decimals) : String(Math.round(value));
}

function parse(raw: string) {
  // Deutsche Tastaturen liefern häufig ein Komma.
  return Number.parseFloat(raw.replace(",", "."));
}

/**
 * Zahleneingabe für die Satzprotokollierung.
 *
 * Der getippte Text lebt als lokaler Entwurf, bis das Feld verlassen wird.
 * Dadurch bleibt ein geleertes Feld leer (statt sofort auf 0 zu springen) und
 * eine kg/lbs-Umrechnung läuft nur einmal beim Commit statt bei jedem Zeichen.
 */
export function StepperInput({
  value,
  onCommit,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 0,
  ariaLabel,
  disabled,
  className,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const repeat = useRef<{ timeout?: number; interval?: number }>({});

  const clamp = useCallback(
    (next: number) => {
      const bounded = Math.min(max, Math.max(min, next));
      const factor = 10 ** decimals;
      return Math.round(bounded * factor) / factor;
    },
    [decimals, max, min],
  );

  const stopRepeat = useCallback(() => {
    if (repeat.current.timeout) window.clearTimeout(repeat.current.timeout);
    if (repeat.current.interval) window.clearInterval(repeat.current.interval);
    repeat.current = {};
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  const commitDraft = (raw: string) => {
    setDraft(null);
    const parsed = parse(raw);
    // Leeres oder unlesbares Feld fällt auf das Minimum zurück, nicht auf 0.
    const next = clamp(Number.isFinite(parsed) ? parsed : min);
    if (next !== value) onCommit(next);
  };

  const nudge = (direction: 1 | -1) => {
    const base = draft === null ? value : parse(draft);
    const start = Number.isFinite(base) ? base : min;
    const next = clamp(start + direction * step);
    setDraft(null);
    if (next !== value) onCommit(next);
  };

  const startRepeat = (direction: 1 | -1) => {
    nudge(direction);
    repeat.current.timeout = window.setTimeout(() => {
      repeat.current.interval = window.setInterval(() => nudge(direction), 90);
    }, 450);
  };

  const buttonClass =
    "flex h-11 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors active:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-input bg-background px-0.5 focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value <= min}
        aria-label={`${ariaLabel} verringern`}
        onPointerDown={() => startRepeat(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        disabled={disabled}
        aria-label={ariaLabel}
        value={draft ?? format(value, decimals)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => commitDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="h-11 w-full min-w-0 flex-1 bg-transparent text-center text-lg font-medium tabular-nums outline-none disabled:opacity-50"
      />
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value >= max}
        aria-label={`${ariaLabel} erhöhen`}
        onPointerDown={() => startRepeat(1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
