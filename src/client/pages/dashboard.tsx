import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { InstallHint } from "@/components/install-hint";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { formatDay } from "@/lib/utils";
import type { SessionSummary, WorkoutPlan, WorkoutSession } from "@shared/types";

function greeting(name: string) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";
  return name ? `${prefix}, ${name}` : prefix;
}

function daysAgo(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";

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
  const history = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<{ sessions: SessionSummary[] }>("/api/sessions"),
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

  /**
   * Vorschlag ist der am längsten nicht trainierte Plan – das rotiert einen
   * Split von selbst. Vorher stand hier immer starr `plans[0]`.
   */
  const suggestion = useMemo(() => {
    if (!availablePlans.length) return null;
    const lastTrained = new Map<string, number>();
    for (const session of history.data?.sessions ?? []) {
      if (!session.planId) continue;
      const current = lastTrained.get(session.planId);
      if (current === undefined || session.startedAt > current) {
        lastTrained.set(session.planId, session.startedAt);
      }
    }
    const ranked = [...availablePlans].sort(
      (a, b) => (lastTrained.get(a.id) ?? 0) - (lastTrained.get(b.id) ?? 0),
    );
    const plan = ranked[0];
    return { plan, lastTrained: lastTrained.get(plan.id) ?? null };
  }, [availablePlans, history.data]);

  const openSession = open.data?.session;
  const isLoading = plans.isLoading || open.isLoading || stats.isLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded-lg bg-muted" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
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
        <h2 className="text-2xl font-semibold">{greeting(me.data?.user.name ?? "")}</h2>
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
            <CardTitle className="text-lg">
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
      ) : suggestion ? (
        <Card className="grid gap-3 bg-gradient-to-br from-orange-500/15 to-transparent">
          <div>
            <p className="text-xs tracking-wide text-orange-400 uppercase">Dein nächstes Training</p>
            <CardTitle className="mt-1 text-lg">{suggestion.plan.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {suggestion.plan.exercises.length} Übungen ·{" "}
              {suggestion.lastTrained
                ? `zuletzt ${daysAgo(suggestion.lastTrained)}`
                : "noch nie trainiert"}
            </p>
          </div>
          <div className="grid gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={start.isPending}
              onClick={() => start.mutate(suggestion.plan.id)}
            >
              <Play className="h-4 w-4" />
              Training starten
            </Button>
            {availablePlans.length > 1 ? (
              <Button variant="secondary" className="w-full" onClick={() => navigate("/plans")}>
                Anderen Plan wählen
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="grid gap-3 bg-gradient-to-br from-orange-500/15 to-transparent">
          <div>
            <CardTitle className="text-lg">Noch kein Trainingsplan</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Erstelle deinen ersten Plan passend zu deinem Ziel.
            </p>
          </div>
          <div className="grid gap-2">
            <Button size="lg" className="w-full" onClick={() => navigate("/plans/generate")}>
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

      <div className="grid grid-cols-2 gap-3">
        <Card compact>
          <p className="text-xs text-muted-foreground">Volumen 7 Tage</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats.data
              ? `${Math.round(kgToDisplay(stats.data.weekVolume, unit)).toLocaleString("de-DE")}`
              : "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unitLabel(unit)}
            </span>
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
