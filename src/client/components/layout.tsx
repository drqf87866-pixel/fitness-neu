import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Activity, CalendarDays, CircleUser, Dumbbell, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthQuery } from "@/lib/auth";

const links = [
  { to: "/", label: "Start", icon: Home },
  { to: "/plans", label: "Pläne", icon: Dumbbell },
  { to: "/history", label: "Verlauf", icon: CalendarDays },
  { to: "/analytics", label: "Fortschritt", icon: Activity },
];

export function AppLayout() {
  const { data } = useAuthQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkout = location.pathname.startsWith("/workout/");

  return (
    <div
      className={cn(
        "mx-auto min-h-dvh w-full",
        isWorkout ? "max-w-lg" : "max-w-lg md:max-w-3xl lg:max-w-4xl",
        !isWorkout && "pb-24",
      )}
    >
      <header className="flex items-center justify-between px-4 py-4">
        {location.pathname.startsWith("/workout/") ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-400">Live-Training</p>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">Fitness Neu</p>
            <h1 className="text-lg font-semibold">{data?.user.name ?? "Training"}</h1>
          </div>
        )}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          aria-label="Profil"
          title="Profil"
          onClick={() => navigate("/profile")}
        >
          <CircleUser className="h-7 w-7" />
        </button>
      </header>
      <main className="px-4">
        <Outlet />
      </main>
      {!isWorkout ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-safe backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
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
