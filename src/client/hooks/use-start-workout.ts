import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { WorkoutSession } from "@shared/types";

/**
 * Startet ein Training (mit Plan oder frei) und öffnet es. Läuft bereits eins,
 * liefert der Server dieses zurück (`resumed`) – dann erklärt ein Hinweis,
 * warum nicht der gewählte Plan erscheint.
 */
export function useStartWorkout(onStarted?: () => void) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string | null) =>
      api<{ session: WorkoutSession; resumed?: boolean }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
    onSuccess: (data, planId) => {
      void queryClient.invalidateQueries({ queryKey: ["session-open"] });
      if (data.resumed && data.session.planId !== planId) {
        toast.message("Laufendes Training fortgesetzt", {
          description: "Beende es zuerst, um ein neues zu starten.",
        });
      }
      onStarted?.();
      navigate(`/workout/${data.session.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
}
