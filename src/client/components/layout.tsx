import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Activity, CalendarDays, CircleUser, Dumbbell, Home, WifiOff } from "lucide-react";
import { QuickStartButton } from "@/components/quick-start";
import { useOnline } from "@/hooks/use-online";
import { resetViewportZoom } from "@/lib/viewport";
import { cn } from "@/lib/utils";

const leftLinks = [
  { to: "/", label: "Start", icon: Home },
  { to: "/plans", label: "Pläne", icon: Dumbbell },
];

const rightLinks = [
  { to: "/history", label: "Verlauf", icon: CalendarDays },
  { to: "/analytics", label: "Fortschritt", icon: Activity },
];

function navItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    // min-w-0 + truncate: die Labels sind unbrechbare Einzelwörter
    // ("Fortschritt") und sprengen bei aktivierter Schriftskalierung sonst
    // ihre 1fr-Spur – die Nav ist fixed, das kostet die ganze Seite den
    // seitlichen Halt.
    "flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 truncate text-[11px] font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground",
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnline();

  // SPA-Navigation schleift einen gemerkten Mobile-Zoom mit (Seite erscheint
  // dann breiter als der Viewport) – pro Route neu auf initial-scale zwingen.
  useEffect(() => {
    resetViewportZoom();
  }, [location.pathname]);

  // Das Live-Training bringt eigenen Kopf und eigene Aktionsleiste mit.
  const isWorkout = location.pathname.startsWith("/workout/");

  return (
    <div
      className={cn(
        "mx-auto min-h-dvh w-full",
        isWorkout ? "max-w-lg" : "max-w-lg pb-28 md:max-w-3xl lg:max-w-4xl",
      )}
    >
      {!isWorkout ? (
        <header className="flex items-center justify-between px-4 pt-safe pb-2">
          <p className="text-xs tracking-[0.2em] text-orange-400 uppercase">Fitness Neu</p>
          <button
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            type="button"
            aria-label="Profil"
            title="Profil"
            onClick={() => navigate("/profile")}
          >
            <CircleUser className="h-7 w-7" />
          </button>
        </header>
      ) : null}

      {!online ? (
        <div className={cn("px-4", isWorkout && "pt-safe")}>
          <p className="flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            Offline – Änderungen werden lokal gespeichert und später übertragen.
          </p>
        </div>
      ) : null}

      <main className={cn("px-4", !isWorkout && "pt-2")}>
        <Outlet />
      </main>

      {!isWorkout ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-safe backdrop-blur"
          aria-label="Hauptnavigation"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 items-center">
            {leftLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navItemClass}>
                <link.icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            ))}
            <QuickStartButton className="-mt-4" />
            {rightLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                <link.icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
