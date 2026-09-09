import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Filter-Chip für horizontal scrollbare Leisten (statt gestapelter Selects). */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "border-orange-500 bg-orange-500/15 text-orange-300"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
