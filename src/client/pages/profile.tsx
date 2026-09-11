import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, Field } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { useAuthQuery, useLogout } from "@/lib/auth";
import { clearLocalSession, clearOrphaned, loadLocalSessions, loadUnsyncedSessions } from "@/lib/db";
import { isOverflowDebugEnabled, setOverflowDebug } from "@/lib/debug-flag";
import { IMAGE_CREDITS } from "@/lib/exercise-images";
import { EXPERIENCE_LABELS, GOAL_LABELS } from "@/lib/labels";
import { clearDeadLetters, flushOfflineQueue, readDeadLetters, syncSession } from "@/lib/sync";
import { displayToKg, kgToDisplay, unitLabel } from "@/lib/units";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@shared/types";

type ProfileForm = {
  name: string;
  targetGoal: string;
  experienceLevel: string;
  /** Eingabe in der gewählten Einheit, als Text – sonst ließe sich kein Komma tippen. */
  weight: string;
  calorieTarget: string;
  unit: UserProfile["unit"];
};

function formFromUser(user: UserProfile): ProfileForm {
  return {
    name: user.name,
    targetGoal: user.targetGoal ?? "",
    experienceLevel: user.experienceLevel ?? "",
    weight: user.weightKg === null ? "" : String(kgToDisplay(user.weightKg, user.unit)),
    calorieTarget: user.calorieTarget === null ? "" : String(user.calorieTarget),
    unit: user.unit,
  };
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

const selectClass = "h-11 rounded-lg border border-input bg-muted px-3 text-base";

/** Lokale Trainings, die der Server dauerhaft abgelehnt hat, und verworfene Alt-Queue-Einträge. */
function useSyncProblems() {
  return useQuery({
    queryKey: ["sync-problems"],
    queryFn: async () => {
      const sessions = await loadLocalSessions();
      return {
        orphans: sessions.filter((entry) => entry.orphaned),
        deadLetters: readDeadLetters(),
      };
    },
  });
}

export function ProfilePage() {
  const me = useAuthQuery();
  const logout = useLogout();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [overflowDebug] = useState(isOverflowDebugEnabled);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const syncProblems = useSyncProblems();

  // Neue Serverdaten (Speichern, Refetch bei Fokus) übernehmen – aber keine
  // ungespeicherten Eingaben überschreiben.
  const appliedUser = useRef<ProfileForm | null>(null);
  useEffect(() => {
    const user = me.data?.user;
    if (!user) return;
    const next = formFromUser(user);
    setForm((current) =>
      current === null || JSON.stringify(current) === JSON.stringify(appliedUser.current)
        ? next
        : current,
    );
    appliedUser.current = next;
  }, [me.data]);

  const changePassword = useMutation({
    mutationFn: () =>
      api<{ ok: boolean }>("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
        }),
      }),
    onSuccess: () => {
      setPwForm({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      toast.success("Passwort geändert", {
        description: "Alle anderen Geräte wurden abgemeldet.",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const submitPassword = () => {
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Die neuen Passwörter stimmen nicht überein");
      return;
    }
    changePassword.mutate();
  };

  const save = useMutation({
    mutationFn: (current: ProfileForm) => {
      const weight = parseNumber(current.weight);
      const calories = parseNumber(current.calorieTarget);
      if (Number.isNaN(weight)) throw new Error("Körpergewicht: Ungültiger Wert");
      if (Number.isNaN(calories)) throw new Error("Kalorienziel: Ungültiger Wert");
      return api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: current.name,
          targetGoal: current.targetGoal || null,
          experienceLevel: current.experienceLevel || null,
          // Die API speichert immer kg – die Eingabe ist in der gewählten Einheit.
          weightKg: weight === null ? null : displayToKg(weight, current.unit),
          calorieTarget: calories,
          unit: current.unit,
        }),
      });
    },
    onSuccess: (data) => {
      // Gespeicherten Stand normalisiert anzeigen (z. B. "80,5" → "80.5").
      setForm(formFromUser(data.user));
      queryClient.setQueryData(["me"], data);
      toast.success("Profil gespeichert");
    },
    onError: (error) => toast.error(error.message),
  });

  const retryOrphan = useMutation({
    mutationFn: async (id: string) => {
      await clearOrphaned(id);
      return syncSession(id);
    },
    onSuccess: (outcome) => {
      void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
      if (outcome === "synced" || outcome === "completed") toast.success("Training übertragen");
      else if (outcome === "pending") toast.message("Server nicht erreichbar – später erneut versuchen.");
    },
  });

  async function discardOrphan(id: string) {
    const ok = await confirm({
      title: "Training verwerfen?",
      description: "Die lokal gespeicherten Sätze werden von diesem Gerät gelöscht.",
      confirmLabel: "Verwerfen",
      destructive: true,
    });
    if (!ok) return;
    await clearLocalSession(id);
    void queryClient.invalidateQueries({ queryKey: ["sync-problems"] });
  }

  async function signOut() {
    // Erst versuchen, Offenes zu übertragen – der Logout löscht alle lokalen Daten.
    await flushOfflineQueue();
    const unsynced = await loadUnsyncedSessions();
    if (unsynced.length) {
      const ok = await confirm({
        title: "Trotzdem abmelden?",
        description: `${unsynced.length} ${unsynced.length === 1 ? "Training ist" : "Trainings sind"} noch nicht übertragen und ${unsynced.length === 1 ? "geht" : "gehen"} beim Abmelden verloren.`,
        confirmLabel: "Abmelden und verwerfen",
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await logout.mutateAsync();
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Abmelden fehlgeschlagen");
    }
  }

  const user = me.data?.user;
  const dirty = Boolean(
    form && user && JSON.stringify(form) !== JSON.stringify(formFromUser(user)),
  );

  function changeUnit(unit: UserProfile["unit"]) {
    if (!form) return;
    // Eingetragenes Gewicht mit umrechnen, statt die Zahl stehen zu lassen.
    const weight = parseNumber(form.weight);
    const converted =
      weight === null || Number.isNaN(weight)
        ? form.weight
        : String(kgToDisplay(displayToKg(weight, form.unit), unit));
    setForm({ ...form, unit, weight: converted });
  }

  const problems = syncProblems.data;
  const hasProblems = Boolean(problems && (problems.orphans.length || problems.deadLetters.length));

  return (
    <div className="grid gap-4">
      {/* Persönliche Daten */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Persönliche Daten</h3>
        <Card className="grid gap-3">
          <Field>
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={form?.name ?? ""}
              onChange={(e) => form && setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="profile-goal">Ziel</Label>
            <select
              id="profile-goal"
              className={selectClass}
              value={form?.targetGoal ?? ""}
              onChange={(e) => form && setForm({ ...form, targetGoal: e.target.value })}
            >
              <option value="">Keine Angabe</option>
              {Object.entries(GOAL_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label htmlFor="profile-experience">Erfahrung</Label>
            <select
              id="profile-experience"
              className={selectClass}
              value={form?.experienceLevel ?? ""}
              onChange={(e) => form && setForm({ ...form, experienceLevel: e.target.value })}
            >
              <option value="">Keine Angabe</option>
              {Object.entries(EXPERIENCE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      </div>

      {/* Körperdaten */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Körperdaten</h3>
        <Card className="grid gap-3">
          <Field>
            <Label htmlFor="profile-unit">Einheit</Label>
            <select
              id="profile-unit"
              className={selectClass}
              value={form?.unit ?? "kg"}
              onChange={(e) => changeUnit(e.target.value as UserProfile["unit"])}
            >
              <option value="kg">Kilogramm (kg)</option>
              <option value="lbs">Pfund (lbs)</option>
            </select>
          </Field>
          <Field>
            <Label htmlFor="profile-weight">Körpergewicht ({unitLabel(form?.unit ?? "kg")})</Label>
            <Input
              id="profile-weight"
              inputMode="decimal"
              value={form?.weight ?? ""}
              onChange={(e) => form && setForm({ ...form, weight: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="profile-calories">Kalorienziel (kcal)</Label>
            <Input
              id="profile-calories"
              inputMode="numeric"
              value={form?.calorieTarget ?? ""}
              onChange={(e) => form && setForm({ ...form, calorieTarget: e.target.value })}
            />
          </Field>
        </Card>
      </div>

      {/* Ein Knopf für beide Karten: vorher lag er nur unter "Persönliche Daten",
          Gewicht und Einheit gingen dadurch leicht ungespeichert verloren. */}
      <Button
        size="lg"
        className="w-full"
        onClick={() => form && save.mutate(form)}
        disabled={!dirty || save.isPending}
      >
        {save.isPending ? "Speichern…" : dirty ? "Änderungen speichern" : "Gespeichert"}
      </Button>

      {/* Training */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Training</h3>
        <Card>
          <Button variant="secondary" className="w-full" onClick={() => navigate("/exercises")}>
            Übungskatalog
          </Button>
        </Card>
      </div>

      {/* Sync-Probleme: nur sichtbar, wenn es welche gibt */}
      {hasProblems && problems ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Sync-Probleme</h3>
          <Card className="grid gap-3">
            {problems.orphans.map((entry) => (
              <div key={entry.session.id} className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
                <div>
                  <p className="font-medium wrap-anywhere">
                    {entry.session.planTitle ?? "Freies Training"} ·{" "}
                    {formatDate(entry.session.startedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.session.sets.filter((set) => set.isCompleted).length} erledigte Sätze
                    · Server: {entry.orphaned?.message} ({entry.orphaned?.status ?? "?"})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={retryOrphan.isPending}
                    onClick={() => retryOrphan.mutate(entry.session.id)}
                  >
                    Erneut senden
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-red-400"
                    onClick={() => void discardOrphan(entry.session.id)}
                  >
                    Verwerfen
                  </Button>
                </div>
              </div>
            ))}
            {problems.deadLetters.length ? (
              <div className="grid gap-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Vom Server abgelehnte ältere Sync-Einträge:
                </p>
                {problems.deadLetters.map((entry) => (
                  <p key={entry.id} className="text-xs wrap-anywhere text-muted-foreground">
                    {formatDate(entry.at)} · {entry.method} {entry.path} · {entry.status ?? "?"}{" "}
                    {entry.message}
                  </p>
                ))}
                <Button variant="outline" className="w-full" onClick={clearDeadLetters}>
                  Liste leeren
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {/* Sicherheit */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Sicherheit</h3>
        <Card>
          <Button variant="outline" className="w-full" onClick={() => setPwOpen(true)}>
            Passwort ändern
          </Button>
        </Card>
      </div>

      {/* Diagnose */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Diagnose</h3>
        <Card className="grid gap-2">
          <p className="text-xs text-muted-foreground">
            Zeigt an, welches Element die Seite seitlich sprengt. Nur zur
            Fehlersuche – die App wirkt danach langsamer.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOverflowDebug(!overflowDebug);
              // Die Probe hängt sich beim Start ein; ein Neuladen ist der
              // ehrlichste Weg, sie an- und wieder abzuschalten. Der State
              // wird beim Neuaufbau aus localStorage gelesen.
              window.location.reload();
            }}
          >
            {overflowDebug ? "Overflow-Diagnose ausschalten" : "Overflow-Diagnose einschalten"}
          </Button>
        </Card>
      </div>

      {/* Bildnachweise: CC BY-SA verlangt eine für Nutzer sichtbare Namensnennung. */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Bildnachweise</h3>
        <Card className="grid gap-1 text-xs text-muted-foreground">
          {IMAGE_CREDITS.map((credit) => (
            <p key={credit}>{credit}</p>
          ))}
          <a
            className="text-orange-300 underline"
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.de"
            target="_blank"
            rel="noreferrer"
          >
            Lizenz CC BY-SA 4.0
          </a>
        </Card>
      </div>

      {/* Konto */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Konto</h3>
        <Card>
          <Button
            variant="destructive"
            className="w-full"
            disabled={logout.isPending}
            onClick={() => void signOut()}
          >
            Abmelden
          </Button>
        </Card>
      </div>

      {/* Passwort-Dialog */}
      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} title="Passwort ändern">
        <div className="grid gap-3">
          <Field>
            <Label htmlFor="pw-current">Aktuelles Passwort</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="pw-next">Neues Passwort (min. 8 Zeichen)</Label>
            <Input
              id="pw-next"
              type="password"
              autoComplete="new-password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="pw-confirm">Neues Passwort wiederholen</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            />
          </Field>
          <Button
            className="w-full"
            onClick={submitPassword}
            disabled={
              !pwForm.current || !pwForm.next || !pwForm.confirm || changePassword.isPending
            }
          >
            {changePassword.isPending ? "Wird geändert…" : "Passwort ändern"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
