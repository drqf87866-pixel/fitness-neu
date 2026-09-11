import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useStartWorkout } from "@/hooks/use-start-workout";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { WorkoutPlan, WorkoutSession } from "@shared/types";

/**
 * Zentraler Start-Knopf der Bottom-Navigation.
 *
 * Läuft ein Training bereits, springt er direkt hinein. Sonst öffnet er die
 * Planauswahl – vorher war ein Trainingsstart nur über das Dashboard erreichbar.
 */
export function QuickStartButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const openSession = useQuery({
    queryKey: ["session-open"],
    queryFn: () => api<{ session: WorkoutSession | null }>("/api/sessions/open"),
  });

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: WorkoutPlan[] }>("/api/plans"),
    enabled: open,
  });

  const start = useStartWorkout(() => setOpen(false));

  const running = openSession.data?.session ?? null;

  return (
    <>
      <div className={cn("flex items-center justify-center", className)}>
        <button
          type="button"
          aria-label={running ? "Laufendes Training fortsetzen" : "Training starten"}
          onClick={() => {
            if (running) navigate(`/workout/${running.id}`);
            else setOpen(true);
          }}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg shadow-orange-500/20 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "bg-primary",
          )}
        >
          <Play className="h-6 w-6 fill-current" />
          {running ? (
            <span
              className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-400"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Training starten"
        description="Wähle einen Plan oder trainiere frei."
      >
        <div className="grid gap-2 pb-2">
          {plans.isLoading ? (
            <>
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            </>
          ) : (
            (plans.data?.plans ?? []).map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={start.isPending}
                onClick={() => start.mutate(plan.id)}
                className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.exercises.length} Übungen ·{" "}
                    {plan.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0)} Sätze
                  </p>
                </div>
                <Play className="h-5 w-5 shrink-0 text-orange-400" />
              </button>
            ))
          )}

          <Button
            variant="secondary"
            size="lg"
            className="mt-1 w-full"
            disabled={start.isPending}
            onClick={() => start.mutate(null)}
          >
            <Plus className="h-4 w-4" />
            Freies Training
          </Button>
        </div>
      </Sheet>
    </>
  );
}
