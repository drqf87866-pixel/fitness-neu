import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { MUSCLE_GROUPS } from "@/lib/labels";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { daysAgo } from "@/lib/utils";
import type { MuscleVolume, Unit } from "@shared/types";

/**
 * Rollierendes 7-Tage-Volumen je Muskelgruppe.
 *
 * Der Query-Key beginnt mit "volume", damit die bestehenden Invalidierungen
 * nach einem Training (workout.tsx) und nach dem Löschen einer Session
 * (history.tsx) per Prefix-Match auch diese Kachel treffen.
 */
export function useMuscleVolume() {
  return useQuery({
    queryKey: ["volume", "muscles-7d"],
    queryFn: () => api<{ muscles: MuscleVolume[] }>("/api/analytics/muscles"),
  });
}

type GroupTotal = {
  key: string;
  label: string;
  volume: number;
  lastTrainedAt: number | null;
};

function groupTotals(muscles: MuscleVolume[]): GroupTotal[] {
  const byMuscle = new Map(muscles.map((entry) => [entry.primaryMuscle, entry]));
  return MUSCLE_GROUPS.map((group) => {
    let volume = 0;
    let lastTrainedAt: number | null = null;
    for (const muscle of group.muscles) {
      const entry = byMuscle.get(muscle);
      if (!entry) continue;
      volume += entry.volume;
      if (entry.lastTrainedAt !== null && (lastTrainedAt === null || entry.lastTrainedAt > lastTrainedAt)) {
        lastTrainedAt = entry.lastTrainedAt;
      }
    }
    return { key: group.key, label: group.label, volume, lastTrainedAt };
  });
}

function formatVolume(kg: number, unit: Unit) {
  return Math.round(kgToDisplay(kg, unit)).toLocaleString("de-DE");
}

export function MuscleVolumeCard() {
  const navigate = useNavigate();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const muscles = useMuscleVolume();

  const groups = useMemo(() => groupTotals(muscles.data?.muscles ?? []), [muscles.data]);
  const total = groups.reduce((sum, group) => sum + group.volume, 0);
  // Balken relativ zum stärksten Bereich – so bleibt auch eine leichte Woche lesbar.
  const max = groups.reduce((peak, group) => Math.max(peak, group.volume), 0);

  return (
    <Card className="grid gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <CardTitle>Muskelgruppen</CardTitle>
        <p className="text-xs text-muted-foreground">
          7 Tage ·{" "}
          <span className="tabular-nums">
            {muscles.isLoading ? "—" : `${formatVolume(total, unit)} ${unitLabel(unit)}`}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {muscles.isLoading
          ? MUSCLE_GROUPS.map((group) => (
              <div key={group.key} className="h-[86px] animate-pulse rounded-xl bg-muted" />
            ))
          : groups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => navigate("/analytics")}
                aria-label={`${group.label}: ${formatVolume(group.volume, unit)} ${unitLabel(unit)} in 7 Tagen – Fortschritt öffnen`}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-3 text-left transition-colors active:border-orange-500/50"
              >
                <p className="text-xs text-muted-foreground">{group.label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatVolume(group.volume, unit)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {unitLabel(unit)}
                  </span>
                </p>
                <div className="flex h-4 items-center">
                  {group.volume > 0 ? (
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${max > 0 ? Math.max(4, (group.volume / max) * 100) : 0}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {group.lastTrainedAt ? `zuletzt ${daysAgo(group.lastTrainedAt)}` : "noch nie"}
                    </p>
                  )}
                </div>
              </button>
            ))}
      </div>
    </Card>
  );
}
