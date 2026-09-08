import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { muscleLabel } from "@/lib/labels";
import { getExerciseImage } from "@/lib/exercise-images";
import type { WorkoutPlan, WorkoutSession } from "@shared/types";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export function PlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: WorkoutPlan[] }>("/api/plans"),
  });
  const plan = plans.data?.plans.find((p) => p.id === planId) ?? null;

  const start = useMutation({
    mutationFn: (id: string) =>
      api<{ session: WorkoutSession }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ planId: id }),
      }),
    onSuccess: (data) => navigate(`/workout/${data.session.id}`),
    onError: (error) => toast.error(error.message),
  });

  if (plans.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Plan nicht gefunden.</p>
        <Button variant="secondary" onClick={() => navigate("/plans")}>
          Zurück zu den Plänen
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Zurück + Titel */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={() => navigate("/plans")}
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold">{plan.title}</h2>
          {plan.description ? (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          ) : null}
        </div>
      </div>

      {/* Metadaten + Starten */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{plan.exercises.length} Übungen</Badge>
          <Badge variant="outline">
            {plan.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)} Sätze
          </Badge>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={start.isPending}
          onClick={() => start.mutate(plan.id)}
        >
          <Play className="h-4 w-4" />
          {plan.title} starten
        </Button>
      </Card>

      {/* Übungen */}
      <div className="grid gap-3">
        {plan.exercises
          .sort((a, b) => a.order - b.order)
          .map((ex, index) => {
            const images = getExerciseImage(ex.exerciseId);
            return (
              <Card key={ex.id} className="grid gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <CardTitle>{ex.exerciseName}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {muscleLabel(ex.primaryMuscle)} ·{" "}
                        {ex.targetSets} × {ex.targetReps}
                      </p>
                    </div>
                  </div>
                </div>
                {images ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="overflow-hidden rounded-lg bg-muted">
                      <img
                        src={images.src0}
                        alt={`${ex.exerciseName} Startposition`}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="overflow-hidden rounded-lg bg-muted">
                      <img
                        src={images.src1}
                        alt={`${ex.exerciseName} Endposition`}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    Kein Bild verfügbar
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {ex.targetSets} Satz{ex.targetSets !== 1 ? "s" : ""} ·{" "}
                  {ex.targetReps} Wiederholungen
                  {ex.restSeconds ? ` · ${ex.restSeconds}s Pause` : ""}
                </p>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
