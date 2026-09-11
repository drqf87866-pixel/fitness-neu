import { QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router";
import { Toaster } from "sonner";
import { AppLayout } from "@/components/layout";
import { ConfirmProvider } from "@/components/ui/confirm";
import { useAuthQuery } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { AnalyticsPage } from "@/pages/analytics";
import { DashboardPage } from "@/pages/dashboard";
import { ExercisesPage } from "@/pages/exercises";
import { GeneratePage } from "@/pages/generate";
import { CreatePlanPage } from "@/pages/create-plan";
import { HistoryPage } from "@/pages/history";
import { LoginPage } from "@/pages/login";
import { PlanDetailPage } from "@/pages/plan-detail";
import { PlansPage } from "@/pages/plans";
import { ProfilePage } from "@/pages/profile";
import { RegisterPage } from "@/pages/register";
import { SessionDetailPage } from "@/pages/session-detail";
import { WorkoutPage } from "@/pages/workout";

/** Hält den Toast über der Bottom-Navigation (56px hohe Zeile + Abstand). */
const TOAST_OFFSET = {
  bottom: "calc(56px + 16px + env(safe-area-inset-bottom))",
  top: "16px",
  left: "16px",
  right: "16px",
};

function Splash() {
  return <div className="grid min-h-dvh place-items-center text-muted-foreground">Lädt…</div>;
}

function AuthUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-semibold">Verbindung zum Konto fehlgeschlagen</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Deine Session wurde nicht gelöscht. Bitte versuche es erneut.
        </p>
        <button className="mt-4 text-sm text-orange-300 underline" type="button" onClick={onRetry}>
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}

function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unbekannter Fehler";

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-semibold">Seite konnte nicht geladen werden</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <button
            className="text-sm text-orange-300 underline"
            type="button"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </button>
          <button
            className="text-sm text-muted-foreground underline"
            type="button"
            onClick={() => navigate("/")}
          >
            Zurück zum Start
          </button>
        </div>
      </div>
    </div>
  );
}

function RequireAuth() {
  const me = useAuthQuery();
  if (me.isLoading) return <Splash />;
  if (me.error) {
    if (me.error instanceof ApiError && me.error.status === 401) return <Navigate to="/login" replace />;
    return <AuthUnavailable onRetry={() => void me.refetch()} />;
  }
  if (!me.data?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function GuestOnly() {
  const me = useAuthQuery();
  if (me.isLoading) return <Splash />;
  if (me.error && !(me.error instanceof ApiError && me.error.status === 401)) {
    return <AuthUnavailable onRetry={() => void me.refetch()} />;
  }
  if (me.data?.user) return <Navigate to="/" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/plans", element: <PlansPage /> },
          { path: "/plans/generate", element: <GeneratePage /> },
          { path: "/plans/new", element: <CreatePlanPage /> },
          { path: "/plans/:planId", element: <PlanDetailPage /> },
          { path: "/plans/:planId/edit", element: <CreatePlanPage /> },
          { path: "/history", element: <HistoryPage /> },
          { path: "/sessions/:id", element: <SessionDetailPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/exercises", element: <ExercisesPage /> },
          { path: "/workout/:id", element: <WorkoutPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <RouterProvider router={router} />
        {/* Unten, damit Meldungen nicht den Header verdecken. Der Offset hält
            sie über der Bottom-Navigation (56px hohe Zeile + Abstand) und
            berücksichtigt zusätzlich die Safe-Area – ein fester Pixelwert
            reichte auf Geräten mit Home-Indicator nicht aus und der Toast
            überlappte dort die Nav für seine Anzeigedauer. Sonner nutzt unter
            600px Viewportbreite (praktisch jedes Handy) eine eigene
            --mobile-offset-Variable statt --offset – ohne mobileOffset bleibt
            der obige Offset dort wirkungslos. Objekt statt String, damit der
            Nav-Abstand nur unten sitzt. Die von Sonner trotzdem gesetzten
            seitlichen Mobile-Offsets (left:16px + width:100%) fängt der
            Override in index.css ab – sonst ragt der fixe Toaster 16px über
            den Viewport und macht die Seite seitlich verschiebbar. */}
        <Toaster
          theme="dark"
          position="bottom-center"
          offset={TOAST_OFFSET}
          mobileOffset={TOAST_OFFSET}
        />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
