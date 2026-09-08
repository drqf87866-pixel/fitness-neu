import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  seconds: number;
  running: boolean;
  onDone: () => void;
  onSkip: () => void;
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* ignore */
  }
}

async function notify(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
  navigator.vibrate?.([200, 80, 200]);
}

export function RestTimer({ seconds, running, onDone, onSkip }: Props) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);

  useEffect(() => {
    setLeft(seconds);
    done.current = false;
  }, [seconds, running]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          if (!done.current) {
            done.current = true;
            beep();
            void notify("Pause vorbei", "Nächster Satz.");
            onDone();
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, onDone]);

  if (!running) return null;

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const fraction = left / seconds;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-[min(92%,28rem)] rounded-2xl border border-orange-500/40 bg-card/95 p-4 pb-safe backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pause</p>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <p className="text-4xl font-semibold tabular-nums">
            {mm}:{ss}
          </p>
          <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>
        <Button variant="secondary" onClick={onSkip}>
          Überspringen
        </Button>
      </div>
    </div>
  );
}
