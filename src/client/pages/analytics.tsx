import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import { VolumeChart } from "@/components/volume-chart";
import { PrBadge } from "@/components/pr-badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { kgToDisplay, unitLabel } from "@/lib/units";
import type { PersonalRecord, VolumePoint } from "@shared/types";

export function AnalyticsPage() {
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const prs = useQuery({
    queryKey: ["prs"],
    queryFn: () => api<{ prs: PersonalRecord[] }>("/api/analytics/prs"),
  });
  const volume = useQuery({
    queryKey: ["volume"],
    queryFn: () => api<{ volume: VolumePoint[] }>("/api/analytics/volume"),
  });

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Fortschritt</h2>

      {/* Wochenübersicht */}
      <Card>
        <CardTitle>Wöchentliches Volumen</CardTitle>
        {volume.isLoading ? (
          <div className="mt-3 space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2 animate-pulse rounded-full bg-muted" />
            <div className="h-2 animate-pulse rounded-full bg-muted" />
          </div>
        ) : (
          <div className="mt-3">
            <VolumeChart points={volume.data?.volume ?? []} />
          </div>
        )}
      </Card>

      {/* Personal Records */}
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
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
            >
              <div>
                <p className="font-medium">{pr.exerciseName}</p>
                <p className="text-xs text-muted-foreground">
                  {kgToDisplay(pr.maxWeight, unit)} {unitLabel(unit)} ×{" "}
                  {pr.maxWeightReps} · 1RM{" "}
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
            Noch keine persönlichen Rekorde. Starte ein Training und setze neue
            Bestmarken!
          </p>
        )}
      </Card>
    </div>
  );
}
