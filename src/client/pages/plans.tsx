import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Play, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanEditor } from "@/components/plan-editor";
import { api } from "@/lib/api";
import type { WorkoutPlan, WorkoutSession } from "@shared/types";
import { toast } from "sonner";

export function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
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
    onSuccess: (data) => navigate(`/workout/${data.session.id}`),
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan gelöscht");
    },
  });

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Trainingspläne</h2>

      {/* Erstellungsdialog */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          compact
          className="flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed py-6 text-center hover:border-orange-500/50"
          onClick={() => navigate("/plans/new")}
        >
          <Plus className="h-6 w-6 text-orange-400" />
          <p className="text-sm font-medium">Manuell erstellen</p>
          <p className="text-xs text-muted-foreground">
            Übungen selbst auswählen
          </p>
        </Card>
        <Card
          compact
          className="flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed py-6 text-center hover:border-orange-500/50"
          onClick={() => navigate("/plans/generate")}
        >
          <Sparkles className="h-6 w-6 text-orange-400" />
          <p className="text-sm font-medium">Mit KI erstellen</p>
          <p className="text-xs text-muted-foreground">
            Ziel, Tage und Equipment beschreiben
          </p>
        </Card>
      </div>

      {/* Pläne */}
      {plans.data?.plans.length ? (
        <div className="grid gap-3">
          {plans.data.plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col gap-3">
              <div
                className="flex cursor-pointer items-start justify-between"
                onClick={() => navigate(`/plans/${plan.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <CardTitle>{plan.title}</CardTitle>
                  {plan.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {plan.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[11px]">
                      {plan.exercises.length} Übungen
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {plan.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)} Sätze
                    </Badge>
                  </div>

                </div>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === plan.id ? null : plan.id);
                    }}
                    aria-label="Mehr Optionen"
                  >
                    ⋯
                  </Button>
                  {menuOpen === plan.id ? (
                    <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(plan);
                          setEditorOpen(true);
                          setMenuOpen(null);
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Plan "${plan.title}" wirklich löschen?`,
                            )
                          ) {
                            remove.mutate(plan.id);
                          }
                          setMenuOpen(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Löschen
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={start.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  start.mutate(plan.id);
                }}
              >
                <Play className="h-4 w-4" />
                {plan.title} starten
              </Button>
            </Card>
          ))}
        </div>
      ) : plans.isLoading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <Card compact className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Trainingspläne. Erstelle jetzt deinen ersten Plan.
          </p>
        </Card>
      )}

      <PlanEditor open={editorOpen} plan={editing} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
