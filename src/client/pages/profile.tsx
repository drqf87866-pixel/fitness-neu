import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuthQuery, useLogout } from "@/lib/auth";
import { EXPERIENCE_LABELS, GOAL_LABELS } from "@/lib/labels";
import type { UserProfile } from "@shared/types";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function ProfilePage() {
  const me = useAuthQuery();
  const logout = useLogout();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (me.data?.user) setForm(me.data.user);
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
      toast.success("Passwort geändert");
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
    mutationFn: () =>
      api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          targetGoal: form.targetGoal ?? null,
          weightKg: form.weightKg ?? null,
          experienceLevel: form.experienceLevel ?? null,
          calorieTarget: form.calorieTarget ?? null,
          unit: form.unit,
        }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      toast.success("Profil gespeichert");
    },
    onError: (error) => toast.error(error.message),
  });

  const unit = form.unit ?? "kg";
  const weightLabel = unit === "kg" ? "Körpergewicht (kg)" : "Körpergewicht (lbs)";

  return (
    <div className="grid gap-4">
      {/* Persönliche Daten */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Persönliche Daten
        </h3>
        <Card className="grid gap-3">
          <Field>
            <Label>Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field>
            <Label>Ziel</Label>
            <select
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={form.targetGoal ?? "hypertrophy"}
              onChange={(e) =>
                setForm({ ...form, targetGoal: e.target.value })
              }
            >
              {Object.entries(GOAL_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Erfahrung</Label>
            <select
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={form.experienceLevel ?? "beginner"}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceLevel: e.target.value as UserProfile["experienceLevel"],
                })
              }
            >
              {Object.entries(EXPERIENCE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? "Speichern…" : "Änderungen speichern"}
          </Button>
        </Card>
      </div>

      {/* Körperdaten */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Körperdaten
        </h3>
        <Card className="grid gap-3">
          <Field>
            <Label>{weightLabel}</Label>
            <Input
              type="number"
              value={form.weightKg ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  weightKg: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <Field>
            <Label>Kalorienziel</Label>
            <Input
              type="number"
              value={form.calorieTarget ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  calorieTarget: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <Field>
            <Label>Einheit</Label>
            <select
              className="h-11 rounded-lg border border-input bg-muted px-3 text-sm"
              value={form.unit ?? "kg"}
              onChange={(e) =>
                setForm({
                  ...form,
                  unit: e.target.value as UserProfile["unit"],
                })
              }
            >
              <option value="kg">Kilogramm (kg)</option>
              <option value="lbs">Pfund (lbs)</option>
            </select>
          </Field>
        </Card>
      </div>

      {/* Training */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Training
        </h3>
        <Card>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/exercises")}
          >
            Übungskatalog
          </Button>
        </Card>
      </div>

      {/* Sicherheit */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Sicherheit
        </h3>
        <Card>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setPwOpen(true)}
          >
            Passwort ändern
          </Button>
        </Card>
      </div>

      {/* Konto */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Konto
        </h3>
        <Card>
          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              await logout.mutateAsync();
              navigate("/login");
            }}
          >
            Abmelden
          </Button>
        </Card>
      </div>

      {/* Passwort-Dialog */}
      <Dialog
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Passwort ändern"
      >
        <div className="grid gap-3">
          <Field>
            <Label>Aktuelles Passwort</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={pwForm.current}
              onChange={(e) =>
                setPwForm({ ...pwForm, current: e.target.value })
              }
            />
          </Field>
          <Field>
            <Label>Neues Passwort</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
            />
          </Field>
          <Field>
            <Label>Neues Passwort wiederholen</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirm: e.target.value })
              }
            />
          </Field>
          <Button
            className="w-full"
            onClick={submitPassword}
            disabled={
              !pwForm.current ||
              !pwForm.next ||
              !pwForm.confirm ||
              changePassword.isPending
            }
          >
            {changePassword.isPending ? "Wird geändert…" : "Passwort ändern"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
