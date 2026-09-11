import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/** Gemeinsame Instanz – auch der Offline-Sync muss nach einem Upload Listen auffrischen. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        error instanceof ApiError ? error.status >= 500 && failureCount < 2 : failureCount < 1,
    },
  },
});

/** Alles, was sich durch ein abgeschlossenes oder geändertes Training verschiebt. */
export function invalidateTrainingQueries() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
    queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    queryClient.invalidateQueries({ queryKey: ["session-open"] }),
    queryClient.invalidateQueries({ queryKey: ["session"] }),
    queryClient.invalidateQueries({ queryKey: ["prs"] }),
    queryClient.invalidateQueries({ queryKey: ["volume"] }),
  ]);
}
