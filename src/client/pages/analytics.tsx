import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import { VolumeChart } from "@/components/volume-chart";
import { PrBadge } from "@/components/pr-badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { PersonalRecord, VolumePoint } from "@shared/types";

const RANGES = [
  { weeks: 4, label: "4 Wochen" },
  { weeks: 8, label: "8 Wochen" },
  { weeks: 12, label: "12 Wochen" },
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function AnalyticsPage() {
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const [weeks, setWeeks] = useState<number>(8);

  const prs = useQuery({
    queryKey: ["prs"],
    queryFn: () => api<{ prs: PersonalRecord[] }>("/api/analytics/prs"),
  });

  const volume = useQuery({
    queryKey: ["volume", weeks],
    queryFn: () => {
      // Bis zum Ende der laufenden Woche, damit die aktuelle Woche vollständig zählt.
      const to = Date.now();
      const from = to - weeks * WEEK_MS;
      return api<{ volume: VolumePoint[] }>(`/api/analytics/volume?from=${from}&to=${to}`);
    },
  });

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Fortschritt</h2>

      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Trainingsvolumen</CardTitle>
          <div className="flex gap-1" role="group" aria-label="Zeitraum">
            {RANGES.map((range) => (
              <button
                key={range.weeks}
                type="button"
                aria-pressed={weeks === range.weeks}
                onClick={() => setWeeks(range.weeks)}
                className={cn(
                  "h-9 rounded-lg px-2.5 text-xs font-medium transition-colors",
                  weeks === range.weeks
                    ? "bg-orange-500/15 text-orange-300"
                    : "text-muted-foreground",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {volume.isLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-28 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <VolumeChart points={volume.data?.volume ?? []} unit={unit} weeks={weeks} />
        )}
      </Card>

      <Card className="grid gap-3">
        <CardTitle>Persönliche Rekorde</CardTitle>
        {prs.isLoading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (prs.data?.prs ?? []).length > 0 ? (
          (prs.data?.prs ?? []).map((pr) => (
            <div
              key={pr.exerciseId}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{pr.exerciseName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {kgToDisplay(pr.maxWeight, unit)} {unitLabel(unit)} × {pr.maxWeightReps} · 1RM{" "}
                  {kgToDisplay(pr.estimated1rm, unit)} {unitLabel(unit)}
                </p>
                {pr.achievedAt ? (
                  <p className="text-xs text-muted-foreground">
                    {new Date(pr.achievedAt).toLocaleDateString("de-DE")}
                  </p>
                ) : null}
              </div>
              <PrBadge isPr />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine persönlichen Rekorde. Starte ein Training und setze neue Bestmarken!
          </p>
        )}
      </Card>
    </div>
  );
}
