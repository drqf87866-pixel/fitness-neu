import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Dumbbell, MoreHorizontal, Pencil, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import type { WorkoutPlan, WorkoutSession } from "@shared/types";

export function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  // Aktionsmenü als Sheet: das frühere Dropdown ließ sich per Tap daneben
  // nicht schließen und war mit 32 px zu klein zum Treffen.
  const [menuPlan, setMenuPlan] = useState<WorkoutPlan | null>(null);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: WorkoutPlan[] }>("/api/plans"),
  });

  const start = useMutation({
    mutationFn: (planId: string) =>
      api<{ session: WorkoutSession }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["session-open"] });
      navigate(`/workout/${data.session.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan gelöscht");
    },
    onError: (error) => toast.error(error.message),
  });

  async function confirmDelete(plan: WorkoutPlan) {
    setMenuPlan(null);
    const ok = await confirm({
      title: "Plan löschen?",
      description: `„${plan.title}" wird dauerhaft entfernt. Bereits absolvierte Trainings bleiben im Verlauf erhalten.`,
      confirmLabel: "Löschen",
      destructive: true,
    });
    if (ok) remove.mutate(plan.id);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Trainingspläne</h2>
        {/* Der Übungskatalog lag bisher drei Ebenen tief unter Profil. */}
        <Button variant="secondary" onClick={() => navigate("/exercises")}>
          <Dumbbell className="h-4 w-4" />
          Übungen
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/plans/new")}
          className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card p-3 text-center transition-colors active:border-orange-500/50"
        >
          <Plus className="h-6 w-6 text-orange-400" />
          <span className="text-sm font-medium">Manuell erstellen</span>
          <span className="text-xs text-muted-foreground">Übungen selbst auswählen</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/plans/generate")}
          className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card p-3 text-center transition-colors active:border-orange-500/50"
        >
          <Sparkles className="h-6 w-6 text-orange-400" />
          <span className="text-sm font-medium">Mit KI erstellen</span>
          <span className="text-xs text-muted-foreground">Ziel und Equipment beschreiben</span>
        </button>
      </div>

      {plans.isLoading ? (
        <div className="space-y-3">
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : plans.data?.plans.length ? (
        <div className="grid gap-3">
          {plans.data.plans.map((plan) => (
            <Card key={plan.id} className="grid gap-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => navigate(`/plans/${plan.id}`)}
                >
                  <CardTitle className="truncate">{plan.title}</CardTitle>
                  {plan.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[11px]">
                      {plan.exercises.length} Übungen
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {plan.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0)} Sätze
                    </Badge>
                  </div>
                </button>
                <button
                  type="button"
                  className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
                  onClick={() => setMenuPlan(plan)}
                  aria-label={`Optionen für ${plan.title}`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={start.isPending}
                onClick={() => start.mutate(plan.id)}
              >
                <Play className="h-4 w-4" />
                Training starten
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid gap-2 py-8 text-center">
          <CardTitle>Noch keine Trainingspläne</CardTitle>
          <p className="text-sm text-muted-foreground">
            Erstelle deinen ersten Plan – manuell oder mit der KI.
          </p>
        </Card>
      )}

      <Sheet
        open={menuPlan !== null}
        onClose={() => setMenuPlan(null)}
        title={menuPlan?.title ?? ""}
      >
        <div className="grid gap-2 pb-2">
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-start"
            onClick={() => {
              const id = menuPlan?.id;
              setMenuPlan(null);
              if (id) navigate(`/plans/${id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start text-red-400"
            onClick={() => menuPlan && void confirmDelete(menuPlan)}
          >
            <Trash2 className="h-4 w-4" />
            Löschen
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
