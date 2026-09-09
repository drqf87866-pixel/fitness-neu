import { useEffect, useRef, useState } from "react";
import { Plus, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Zeitstempel, zu dem die Pause endet. `null` = keine Pause aktiv. */
  endsAt: number | null;
  /** Ursprünglich geplante Pausendauer in Sekunden (für den Fortschrittsring). */
  total: number;
  onDone: () => void;
  onSkip: () => void;
  onExtend: (deltaSeconds: number) => void;
};

function beep() {
  try {
    const ctx = new AudioContext();
    void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    // Kontext wieder freigeben – sonst sammelt sich pro Satz einer an.
    osc.onended = () => void ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}

function notify(title: string, body: string) {
  navigator.vibrate?.([200, 80, 200]);
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* Safari wirft hier in manchen Standalone-Kontexten */
  }
}

export function RestTimer({ endsAt, total, onDone, onSkip, onExtend }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Die Anzeige wird aus der Deadline berechnet, nicht heruntergezählt. Damit
  // stimmt sie auch, wenn der Browser das Intervall bei gesperrtem Display
  // drosselt oder ganz anhält.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [endsAt]);

  useEffect(() => {
    if (endsAt === null || now < endsAt || firedFor.current === endsAt) return;
    firedFor.current = endsAt;
    beep();
    notify("Pause vorbei", "Weiter mit dem nächsten Satz.");
    onDoneRef.current();
  }, [endsAt, now]);

  if (endsAt === null) return null;

  const leftSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const mm = String(Math.floor(leftSeconds / 60)).padStart(2, "0");
  const ss = String(leftSeconds % 60).padStart(2, "0");
  const fraction = total > 0 ? Math.min(1, Math.max(0, leftSeconds / total)) : 0;
  const almostDone = leftSeconds <= 10;

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-3 rounded-2xl border bg-card/95 p-3 backdrop-blur transition-colors",
        almostDone ? "border-orange-500/70" : "border-orange-500/30",
      )}
      role="timer"
      aria-live="off"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pause</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums transition-colors",
              almostDone && "text-orange-400",
            )}
          >
            {mm}:{ss}
          </p>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onExtend(30)}
        aria-label="Pause um 30 Sekunden verlängern"
        className="flex h-11 shrink-0 items-center gap-0.5 rounded-lg bg-muted px-3 text-sm font-medium tabular-nums transition-colors active:bg-neutral-800"
      >
        <Plus className="h-3.5 w-3.5" />
        30s
      </button>
      <button
        type="button"
        onClick={onSkip}
        aria-label="Pause überspringen"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors active:bg-neutral-800"
      >
        <SkipForward className="h-4 w-4" />
      </button>
    </div>
  );
}
