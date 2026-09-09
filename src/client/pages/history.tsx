import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { useAuthQuery } from "@/lib/auth";
import { kgToDisplay, unitLabel } from "@/lib/units";
import { cn, formatDay, formatDuration } from "@/lib/utils";
import type { SessionSummary } from "@shared/types";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const me = useAuthQuery();
  const unit = me.data?.user.unit ?? "kg";

  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const history = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<{ sessions: SessionSummary[] }>("/api/sessions"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/sessions/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["prs"] }),
        queryClient.invalidateQueries({ queryKey: ["volume"] }),
      ]);
      toast.success("Training gelöscht");
    },
    onError: (error) => toast.error(error.message),
  });

  const sessions = useMemo(() => history.data?.sessions ?? [], [history.data]);

  const daysWithWorkouts = useMemo(
    () => new Set(sessions.map((session) => dayKey(new Date(session.startedAt)))),
    [sessions],
  );

  const sessionsThisMonth = useMemo(
    () =>
      sessions
        .filter((session) => {
          const date = new Date(session.startedAt);
          return (
            date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear()
          );
        })
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions, cursor],
  );

  const visibleSessions = useMemo(
    () =>
      selectedDay === null
        ? sessionsThisMonth
        : sessionsThisMonth.filter(
            (session) => new Date(session.startedAt).getDate() === selectedDay,
          ),
    [sessionsThisMonth, selectedDay],
  );

  const monthVolume = sessionsThisMonth.reduce((sum, session) => sum + session.volumeKg, 0);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: startWeekday + daysInMonth }, (_, index) =>
    index < startWeekday ? null : index - startWeekday + 1,
  );

  function changeMonth(delta: number) {
    setSelectedDay(null);
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  async function confirmDelete(session: SessionSummary) {
    const ok = await confirm({
      title: "Training löschen?",
      description: `${session.planTitle ?? "Freies Training"} vom ${formatDay(session.startedAt)} wird dauerhaft entfernt.`,
      confirmLabel: "Löschen",
      destructive: true,
    });
    if (ok) remove.mutate(session.id);
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Verlauf</h2>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => changeMonth(-1)}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-medium">
          {cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => changeMonth(1)}
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Card compact>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
          {cells.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} />;
            const hasWorkout = daysWithWorkouts.has(
              `${cursor.getFullYear()}-${cursor.getMonth()}-${day}`,
            );
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                disabled={!hasWorkout}
                aria-pressed={isSelected}
                aria-label={`${day}. ${cursor.toLocaleDateString("de-DE", { month: "long" })}${hasWorkout ? ", Training" : ", kein Training"}`}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md text-sm transition-colors",
                  hasWorkout && !isSelected && "bg-orange-500 font-semibold text-black",
                  isSelected && "bg-orange-300 font-semibold text-black ring-2 ring-orange-200",
                  !hasWorkout && "text-muted-foreground",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </Card>

      {sessionsThisMonth.length > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {sessionsThisMonth.length} Training{sessionsThisMonth.length !== 1 ? "s" : ""} ·{" "}
            {Math.round(kgToDisplay(monthVolume, unit)).toLocaleString("de-DE")} {unitLabel(unit)}
          </p>
          {selectedDay !== null ? (
            <button
              type="button"
              className="text-orange-300 underline"
              onClick={() => setSelectedDay(null)}
            >
              Filter aufheben
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <Card
              key={session.id}
              compact
              className="flex items-start justify-between gap-2 transition-colors"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() =>
                  navigate(
                    // Offene Trainings gehen weiter, abgeschlossene sind schreibgeschützt.
                    session.completedAt ? `/sessions/${session.id}` : `/workout/${session.id}`,
                  )
                }
              >
                <CardTitle className="truncate">
                  {session.planTitle ?? "Freies Training"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{formatDay(session.startedAt)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {session.completedAt ? (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                      Abgeschlossen
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      Offen
                    </Badge>
                  )}
                  {session.completedAt ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(session.completedAt - session.startedAt)}
                    </span>
                  ) : null}
                  {session.setCount > 0 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      · {session.setCount} Sätze ·{" "}
                      {Math.round(kgToDisplay(session.volumeKg, unit)).toLocaleString("de-DE")}{" "}
                      {unitLabel(unit)}
                    </span>
                  ) : null}
                </div>
              </button>
              {session.completedAt ? (
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
                  aria-label="Training löschen"
                  disabled={remove.isPending}
                  onClick={() => void confirmDelete(session)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </Card>
          ))
        ) : (
          <Card compact className="grid gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {history.isLoading
                ? "Lade…"
                : selectedDay !== null
                  ? "An diesem Tag kein Training."
                  : "Keine Trainings in diesem Monat."}
            </p>
            {!history.isLoading && selectedDay === null ? (
              <Button variant="secondary" onClick={() => navigate("/plans")}>
                Plan auswählen
              </Button>
            ) : null}
          </Card>
        )}
      </div>
    </div>
  );
}
