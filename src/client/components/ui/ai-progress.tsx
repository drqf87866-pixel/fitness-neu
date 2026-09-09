import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TICK_MS = 120;
/** Der Balken nähert sich diesem Wert an und wartet dort auf die Antwort. */
const CEILING = 90;
const EASING = 0.06;

/**
 * Fortschrittsbalken für die KI-Aufrufe.
 *
 * Gemini antwortet ohne Streaming (`:generateContent`), es gibt also keinen
 * echten Fortschritt zu messen. Der Balken schätzt: Er nähert sich zügig 90 %
 * und bleibt dort, bis die Antwort da ist – dann springt er auf 100 %. Ohne
 * das sieht der Nutzer bis zu 20 Sekunden lang gar nichts.
 */
export function AiProgress({
  active,
  label,
  className,
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setPercent(0);
      const timer = setInterval(() => {
        setPercent((current) => current + (CEILING - current) * EASING);
      }, TICK_MS);
      return () => clearInterval(timer);
    }

    if (!visible) return;
    // Erst vollmachen, dann nach der Transition ausblenden.
    setPercent(100);
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
    // `visible` bewusst nicht in den Dependencies: der Ausblend-Timer soll sich
    // nicht selbst neu starten, wenn er `visible` auf false setzt.
  }, [active]);

  if (!visible) return null;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? "KI arbeitet"}
        />
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
}
