import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDay } from "@/lib/utils";
import { cn } from "@/lib/utils";

type HistoryItem = {
  id: string;
  planTitle: string | null;
  startedAt: number;
  completedAt: number | null;
  notes: string | null;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const history = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<{ sessions: HistoryItem[] }>("/api/sessions"),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/api/sessions/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const daysWithWorkouts = useMemo(() => {
    const set = new Set<string>();
    for (const session of history.data?.sessions ?? []) {
      const d = new Date(session.startedAt);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [history.data]);

  const first = startOfMonth(cursor);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from(
    { length: startWeekday + daysInMonth },
    (_, index) => {
      if (index < startWeekday) return null;
      return index - startWeekday + 1;
    },
  );

  const sessionsThisMonth = useMemo(
    () =>
      (history.data?.sessions ?? []).filter((s) => {
        const d = new Date(s.startedAt);
        return (
          d.getMonth() === cursor.getMonth() &&
          d.getFullYear() === cursor.getFullYear()
        );
      }),
    [history.data, cursor],
  );

  const prevMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Verlauf</h2>

      {/* Monatsnavigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={prevMonth}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-medium">
          {cursor.toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={nextMonth}
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Monatszusammenfassung */}
      {sessionsThisMonth.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {sessionsThisMonth.length} Training
          {sessionsThisMonth.length !== 1 ? "s" : ""} in diesem Monat
        </p>
      ) : null}

      {/* Kalender */}
      <Card compact>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {cells.map((day, index) => {
            const key = day
              ? `${cursor.getFullYear()}-${cursor.getMonth()}-${day}`
              : `e-${index}`;
            const active = day
              ? daysWithWorkouts.has(
                  `${cursor.getFullYear()}-${cursor.getMonth()}-${day}`,
                )
              : false;
            return (
              <div
                key={key}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md text-sm",
                  active && "bg-orange-500 font-semibold text-black",
                )}
              >
                {day ?? ""}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sessions-Liste */}
      <div className="grid gap-2">
        {sessionsThisMonth.length > 0 ? (
          sessionsThisMonth
            .sort((a, b) => b.startedAt - a.startedAt)
            .map((session) => (
              <Card
                key={session.id}
                compact
                className="flex cursor-pointer items-start justify-between gap-3 transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/workout/${session.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <CardTitle>
                    {session.planTitle ?? "Freies Training"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDay(session.startedAt)}
                  </p>
                  <div className="mt-1">
                    {session.completedAt ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-400"
                      >
                        Abgeschlossen
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 text-amber-400"
                      >
                        Offen
                      </Badge>
                    )}
                  </div>
                </div>
                {session.completedAt ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    aria-label="Training löschen"
                    disabled={remove.isPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (
                        window.confirm(
                          "Dieses abgeschlossene Training wirklich löschen?",
                        )
                      ) {
                        remove.mutate(session.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </Card>
            ))
        ) : (
          <Card compact className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {history.isLoading
                ? "Lade…"
                : "Keine Trainings in diesem Monat."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
