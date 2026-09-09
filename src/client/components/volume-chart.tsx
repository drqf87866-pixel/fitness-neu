import { useMemo, useState } from "react";
import { muscleLabel } from "@/lib/labels";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { Unit, VolumePoint } from "@shared/types";

type Props = {
  points: VolumePoint[];
  unit: Unit;
  /** Anzahl der dargestellten Wochen inklusive Lücken. */
  weeks?: number;
};

/** Gleiche ISO-Wochenformel wie im Worker (routes/analytics.ts), damit die Schlüssel passen. */
function isoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shortWeekLabel(key: string) {
  return `KW ${key.slice(-2)}`;
}

function formatVolume(kg: number, unit: Unit) {
  return Math.round(kgToDisplay(kg, unit)).toLocaleString("de-DE");
}

/**
 * Zwei getrennte Fragen, zwei Ansichten:
 * "Wochen" zeigt den Verlauf (die Wochendimension der API wurde vorher
 * weggeworfen und die Summe fälschlich als Wochenwert beschriftet),
 * "Muskeln" die Aufteilung im Zeitraum.
 */
export function VolumeChart({ points, unit, weeks = 8 }: Props) {
  const [view, setView] = useState<"weeks" | "muscles">("weeks");
  const [selected, setSelected] = useState<string | null>(null);

  // Lückenlose Wochenachse: Wochen ohne Training sollen sichtbar leer sein,
  // statt aus der Reihe zu verschwinden.
  const weekSeries = useMemo(() => {
    const totals = new Map<string, number>();
    for (const point of points) {
      totals.set(point.week, (totals.get(point.week) ?? 0) + point.volume);
    }
    const series: Array<{ week: string; volume: number }> = [];
    const cursor = new Date();
    for (let index = 0; index < weeks; index += 1) {
      const key = isoWeekKey(cursor);
      series.unshift({ week: key, volume: totals.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() - 7);
    }
    return series;
  }, [points, weeks]);

  const muscleTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const point of points) {
      totals.set(point.primaryMuscle, (totals.get(point.primaryMuscle) ?? 0) + point.volume);
    }
    return [...totals.entries()]
      .map(([muscle, volume]) => ({ muscle, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [points]);

  if (!points.length) {
    return (
      <p className="text-sm text-muted-foreground">Noch kein Volumen in diesem Zeitraum.</p>
    );
  }

  const maxWeek = Math.max(...weekSeries.map((entry) => entry.volume), 1);
  const current = selected
    ? (weekSeries.find((entry) => entry.week === selected) ?? weekSeries[weekSeries.length - 1])
    : weekSeries[weekSeries.length - 1];
  const currentIndex = weekSeries.findIndex((entry) => entry.week === current.week);
  const previous = currentIndex > 0 ? weekSeries[currentIndex - 1] : null;
  const trend =
    previous && previous.volume > 0
      ? Math.round(((current.volume - previous.volume) / previous.volume) * 100)
      : null;

  return (
    <div className="grid gap-3">
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
        {(
          [
            { id: "weeks", label: "Wochen" },
            { id: "muscles", label: "Muskeln" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              "min-h-[38px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
              view === tab.id ? "bg-card text-foreground" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "weeks" ? (
        <div className="grid gap-2">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatVolume(current.volume, unit)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {unitLabel(unit)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {shortWeekLabel(current.week)}
              {trend !== null ? (
                <>
                  {" · "}
                  <span className={trend >= 0 ? "text-emerald-400" : "text-amber-400"}>
                    {trend >= 0 ? "+" : ""}
                    {trend} % ggü. Vorwoche
                  </span>
                </>
              ) : null}
            </p>
          </div>

          {/* Antippbare Balken: auf dem Handy gibt es kein Hover für Tooltips. */}
          <div className="flex h-28 items-end gap-0.5">
            {weekSeries.map((entry) => {
              const isCurrent = entry.week === current.week;
              const heightPercent = (entry.volume / maxWeek) * 100;
              return (
                <button
                  key={entry.week}
                  type="button"
                  onClick={() => setSelected(entry.week)}
                  aria-pressed={isCurrent}
                  aria-label={`${shortWeekLabel(entry.week)}: ${formatVolume(entry.volume, unit)} ${unitLabel(unit)}`}
                  className="flex h-full flex-1 flex-col justify-end rounded-t-[4px]"
                >
                  <span
                    className={cn(
                      "w-full rounded-t-[4px] transition-colors",
                      isCurrent ? "bg-primary" : "bg-orange-500/35",
                    )}
                    style={{ height: `max(2px, ${heightPercent}%)` }}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{shortWeekLabel(weekSeries[0].week)}</span>
            <span>{shortWeekLabel(weekSeries[weekSeries.length - 1].week)}</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {muscleTotals.map((row) => (
            <div key={row.muscle}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{muscleLabel(row.muscle)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatVolume(row.volume, unit)} {unitLabel(unit)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.volume / (muscleTotals[0]?.volume || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
