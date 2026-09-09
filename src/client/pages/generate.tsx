import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { WorkoutPlan } from "@shared/types";
import { toast } from "sonner";

type Goal = "hypertrophy" | "strength" | "fat_loss" | "endurance" | "general";

const GOALS: Array<{ id: Goal; label: string; desc: string }> = [
  { id: "hypertrophy", label: "Muskelaufbau", desc: "Mehr Volumen, 8–12 Wdh." },
  { id: "strength", label: "Kraft", desc: "Weniger Wdh., mehr Gewicht" },
  { id: "fat_loss", label: "Fettabbau", desc: "Höherer Umsatz, Zirkel" },
  { id: "endurance", label: "Ausdauer", desc: "Hohe Wdh., kurze Pausen" },
  { id: "general", label: "Allgemein", desc: "Ausgewogen und abwechslungsreich" },
];

const chips = [
  "3 Tage Push-Pull-Legs, Fokus auf Brust, 45 Min Zeit",
  "Ganzkörper 3x/Woche, Einsteiger, Kurzhanteln",
  "Oberkörper Kraft, 5 Übungen, Kurzhanteln",
  "Beine Hypertrophie, 60 Minuten",
];

export function GeneratePage() {
  const [step, setStep] = useState<"goal" | "prompt">("goal");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const generate = useMutation({
    mutationFn: () =>
      api<{ plan: WorkoutPlan; usedFallback: boolean }>(
        "/api/ai/generate-plan",
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
        },
      ),
    onSuccess: (data) => {
      setPlan(data.plan);
      setUsedFallback(data.usedFallback);
      void queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(
        data.usedFallback ? "Plan per Fallback erzeugt" : "KI-Plan gespeichert",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  function selectGoal(g: Goal) {
    const goalText = GOALS.find((x) => x.id === g)?.label ?? "";
    setPrompt(`${goalText}: `);
    setStep("prompt");
  }

  // Ergebnis
  if (plan) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
            onClick={() => {
              setPlan(null);
              setStep("goal");
            }}
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold">KI-Trainingsplan</h2>
        </div>

        <Card className="grid gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>{plan.title}</CardTitle>
            {usedFallback ? (
              <Badge variant="outline">Fallback</Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                Gemini
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
          <ul className="grid gap-2 text-sm">
            {plan.exercises.map((ex) => (
              <li
                key={ex.id}
                className="flex justify-between rounded-lg bg-muted px-3 py-2"
              >
                <span>{ex.exerciseName}</span>
                <span className="text-muted-foreground">
                  {ex.targetSets} × {ex.targetReps}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => navigate("/plans")}>
              Zu meinen Plänen
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setPlan(null);
                setStep("goal");
              }}
            >
              Neuen Plan erstellen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        {step === "prompt" ? (
          <button
            type="button"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted"
            onClick={() => setStep("goal")}
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div>
          <h2 className="text-xl font-semibold">KI-Trainingsplan</h2>
          <p className="text-sm text-muted-foreground">
            {step === "goal"
              ? "Was möchtest du erreichen?"
              : "Beschreibe Ziel, Tage, Equipment und Dauer."}
          </p>
        </div>
      </div>

      {step === "goal" ? (
        <div className="grid gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-orange-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => selectGoal(g.id)}
            >
              <div>
                <p className="font-medium">{g.label}</p>
                <p className="text-sm text-muted-foreground">{g.desc}</p>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-orange-400" />
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="rounded-full border border-border px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-orange-500/50"
                onClick={() => setPrompt(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="z. B. 4 Tage Oberkörper/Unterkörper, Fokus auf Brust und Rücken, 45 Min."
            className="min-h-24"
          />
          <Button
            size="lg"
            className="w-full"
            disabled={generate.isPending || !prompt.trim()}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              "Generiere…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Plan erzeugen
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
