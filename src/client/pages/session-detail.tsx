import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { muscleLabel } from "@/lib/labels";
import { getExerciseThumbnail } from "@/lib/exercise-images";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import type { WorkoutSession } from "@shared/types";

/**
 * Abgeschlossene Trainings sind hier schreibgeschützt. Vorher öffneten sie die
 * Live-Ansicht, deren Speicherversuche der Server mit 409 ablehnte.
 */
export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";

  const query = useQuery({
    queryKey: ["session", id],
    queryFn: () => api<{ session: WorkoutSession }>(`/api/sessions/${id}`),
    enabled: Boolean(id),
  });

  const restart = useMutation({
    mutationFn: (planId: string | null) =>
      api<{ session: WorkoutSession }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    onSuccess: (data) => navigate(`/workout/${data.session.id}`),
    onError: (error) => toast.error(error.message),
  });

  const session = query.data?.session;

  if (query.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Training nicht gefunden.</p>
        <Button variant="secondary" onClick={() => navigate("/history")}>
          Zurück zum Verlauf
        </Button>
      </div>
    );
  }

  // Eine noch offene Session gehört in die Live-Ansicht, nicht hierher.
  if (!session.completedAt) {
    navigate(`/workout/${session.id}`, { replace: true });
    return null;
  }

  const completedSets = session.sets.filter((set) => set.isCompleted);
  const volumeKg = completedSets.reduce((sum, set) => sum + set.weight * set.reps, 0);
  const duration = session.completedAt - session.startedAt;

  const groups = session.exercises.map((exercise) => ({
    ...exercise,
    sets: session.sets
      .filter((set) => set.exerciseId === exercise.exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber),
  }));

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate("/history")}
          aria-label="Zurück zum Verlauf"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="line-clamp-1 wrap-anywhere text-xl font-semibold">
            {session.planTitle ?? "Freies Training"}
          </h2>
          <p className="text-sm text-muted-foreground">{formatDate(session.startedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card compact>
          <p className="text-xs text-muted-foreground">Dauer</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatDuration(duration)}</p>
        </Card>
        <Card compact>
          <p className="text-xs text-muted-foreground">Volumen</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {Math.round(kgToDisplay(volumeKg, unit)).toLocaleString("de-DE")}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unitLabel(unit)}
            </span>
          </p>
        </Card>
        <Card compact>
          <p className="text-xs text-muted-foreground">Sätze</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{completedSets.length}</p>
        </Card>
      </div>

      {session.notes ? (
        <Card className="grid gap-1">
          <CardTitle className="text-sm text-muted-foreground">Notizen</CardTitle>
          <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {groups.map((group) => {
          const thumb = getExerciseThumbnail(group.exerciseId);
          const done = group.sets.filter((set) => set.isCompleted);
          return (
            <Card key={group.exerciseId} className="grid gap-3">
              <div className="flex items-center gap-3">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  {/* line-clamp-1 statt truncate: nowrap-Min-Content weitet sonst
                      die Grid-Spalte der Karten (siehe workout.tsx). */}
                  <CardTitle className="line-clamp-1 wrap-anywhere">{group.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {muscleLabel(group.primaryMuscle)} · {done.length} von {group.sets.length} Sätzen
                  </p>
                </div>
              </div>
              <div className="grid gap-1">
                {group.sets.map((set) => (
                  <div
                    key={set.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                      set.isCompleted ? "bg-muted" : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <span className="text-muted-foreground">Satz {set.setNumber}</span>
                    <span className="tabular-nums">
                      {set.isCompleted ? (
                        <>
                          {kgToDisplay(set.weight, unit)} {unitLabel(unit)} × {set.reps}
                        </>
                      ) : (
                        "nicht ausgeführt"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {groups.length === 0 ? (
          <Card compact className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              In diesem Training wurden keine Übungen protokolliert.
            </p>
          </Card>
        ) : null}
      </div>

      <Card className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {groups.length} Übung{groups.length !== 1 ? "en" : ""}
          </Badge>
          <Badge variant="success">Abgeschlossen</Badge>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={restart.isPending}
          onClick={() => restart.mutate(session.planId)}
        >
          <Play className="h-4 w-4" />
          Nochmal trainieren
        </Button>
      </Card>
    </div>
  );
}
