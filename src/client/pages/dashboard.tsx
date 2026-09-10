import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Play } from "lucide-react";
import { InstallHint } from "@/components/install-hint";
import { MuscleVolumeCard, useMuscleVolume } from "@/components/muscle-volume";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { formatDay } from "@/lib/utils";
import type { WorkoutSession } from "@shared/types";

function greeting(name: string) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";
  return name ? `${prefix}, ${name}` : prefix;
}

/**
 * Startseite.
 *
 * Der Trainingsstart läuft komplett über den Play-Knopf der Bottom-Navigation
 * (`QuickStartButton`); hier steht stattdessen, was zuletzt bewegt wurde. Nur
 * ein nicht beendetes Training bekommt weiterhin eine eigene Karte.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const me = useAuthQuery();

  const open = useQuery({
    queryKey: ["session-open"],
    queryFn: () => api<{ session: WorkoutSession | null }>("/api/sessions/open"),
  });
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      api<{ weekVolume: number; sessionCountThisWeek: number }>("/api/analytics/dashboard"),
  });
  const muscles = useMuscleVolume();

  const weekSets = (muscles.data?.muscles ?? []).reduce((sum, entry) => sum + entry.setCount, 0);
  const openSession = open.data?.session;

  if (open.isLoading || stats.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded-lg bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="wrap-anywhere text-2xl font-semibold">{greeting(me.data?.user.name ?? "")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.data && stats.data.sessionCountThisWeek > 0
            ? `${stats.data.sessionCountThisWeek} Workout${stats.data.sessionCountThisWeek !== 1 ? "s" : ""} diese Woche`
            : "Bereit für dein nächstes Training?"}
        </p>
      </div>

      <InstallHint />

      {openSession ? (
        <Card className="grid gap-3 border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-transparent">
          <div>
            <Badge variant="outline" className="mb-2 border-orange-500/40 text-orange-300">
              Nicht beendet
            </Badge>
            <CardTitle className="wrap-anywhere text-lg">
              {openSession.planTitle ?? "Freies Training"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {openSession.exercises.length} Übungen · gestartet{" "}
              {formatDay(openSession.startedAt)}
            </p>
          </div>
          <Button size="lg" className="w-full" onClick={() => navigate(`/workout/${openSession.id}`)}>
            <Play className="h-4 w-4" />
            Workout fortsetzen
          </Button>
        </Card>
      ) : null}

      <MuscleVolumeCard />

      <div className="grid grid-cols-2 gap-3">
        <Card compact>
          <p className="text-xs text-muted-foreground">Sätze 7 Tage</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {muscles.isLoading ? "—" : weekSets}
          </p>
        </Card>
        <Card compact>
          <p className="text-xs text-muted-foreground">Workouts diese Woche</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats.data?.sessionCountThisWeek ?? "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}
