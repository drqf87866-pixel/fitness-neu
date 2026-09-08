import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { unitLabel } from "@/lib/units";
import type { WorkoutPlan, WorkoutSession } from "@shared/types";
import { toast } from "sonner";

function greeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Guten Morgen" : h < 17 ? "Guten Tag" : "Guten Abend";
  return `${prefix}, ${name}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";
  const userName = me.data?.user.name ?? "";

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: WorkoutPlan[] }>("/api/plans"),
  });
  const open = useQuery({
    queryKey: ["session-open"],
    queryFn: () => api<{ session: WorkoutSession | null }>("/api/sessions/open"),
  });
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      api<{ weekVolume: number; sessionCountThisWeek: number }>("/api/analytics/dashboard"),
  });

  const start = useMutation({
    mutationFn: (planId?: string | null) =>
      api<{ session: WorkoutSession }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ planId: planId ?? null }),
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["session-open"] });
      navigate(`/workout/${data.session.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const availablePlans = plans.data?.plans ?? [];
  const openSession = open.data?.session;
  const isLoading = plans.isLoading || open.isLoading || stats.isLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded-lg bg-muted" />
        </div>
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Begrüßung */}
      <div>
        <h2 className="text-2xl font-semibold">{greeting(userName)}</h2>
        {stats.data && stats.data.sessionCountThisWeek > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.data.sessionCountThisWeek} Workout{stats.data.sessionCountThisWeek !== 1 ? "s" : ""}
            {" "}diese Woche
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Bereit für dein nächstes Training?</p>
        )}
      </div>

      {/* Primäre Aktion: Nächstes Workout */}
      {openSession ? (
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-transparent">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-orange-500/40 text-orange-300">
                Nicht beendet
              </Badge>
              <CardTitle className="text-lg">
                {openSession.planTitle ?? "Freies Training"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {openSession.exercises.length} Übungen ·{" "}
                {new Date(openSession.startedAt).toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="mt-3 w-full"
            onClick={() => navigate(`/workout/${openSession.id}`)}
          >
            <Play className="h-4 w-4" />
            Workout fortsetzen
          </Button>
        </Card>
      ) : availablePlans.length > 0 ? (
        <Card className="bg-gradient-to-br from-orange-500/15 to-transparent">
          <CardTitle className="text-lg">Dein nächstes Training</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {availablePlans[0].title} ·{" "}
            {availablePlans[0].exercises.length} Übungen
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={start.isPending}
              onClick={() => start.mutate(availablePlans[0].id)}
            >
              <Play className="h-4 w-4" />
              {availablePlans[0].title} starten
            </Button>
            {availablePlans.length > 1 ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate("/plans")}
              >
                Anderen Plan wählen
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-orange-500/15 to-transparent">
          <CardTitle className="text-lg">Noch kein Trainingsplan</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Erstelle deinen ersten Plan passend zu deinem Ziel.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate("/plans/generate")}
            >
              <Sparkles className="h-4 w-4" />
              Plan mit KI erstellen
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={start.isPending}
              onClick={() => start.mutate(null)}
            >
              <Play className="h-4 w-4" />
              Freies Training starten
            </Button>
          </div>
        </Card>
      )}

      {/* Kurzstatistiken */}
      <div className="grid grid-cols-2 gap-3">
        <Card compact>
          <p className="text-xs text-muted-foreground">Volumen 7 Tage</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats.data
              ? `${Math.round(stats.data.weekVolume).toLocaleString("de-DE")} ${unitLabel(unit)}`
              : "—"}
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
