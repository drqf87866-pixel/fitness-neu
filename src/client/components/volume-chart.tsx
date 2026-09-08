import { muscleLabel } from "@/lib/labels";
import type { VolumePoint } from "@shared/types";

export function VolumeChart({ points }: { points: VolumePoint[] }) {
  const muscles = [...new Set(points.map((p) => p.primaryMuscle))];
  const totals = muscles.map((muscle) => ({
    muscle,
    volume: points.filter((p) => p.primaryMuscle === muscle).reduce((sum, p) => sum + p.volume, 0),
  }));
  const max = Math.max(...totals.map((t) => t.volume), 1);

  if (!totals.length) {
    return <p className="text-sm text-muted-foreground">Noch kein Volumen in diesem Zeitraum.</p>;
  }

  return (
    <div className="grid gap-3">
      {totals
        .sort((a, b) => b.volume - a.volume)
        .map((row) => (
          <div key={row.muscle}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{muscleLabel(row.muscle)}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(row.volume)} kg</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(row.volume / max) * 100}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}
