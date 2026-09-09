import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/dialog";
import { useRegister } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export function RegisterPage() {
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await register.mutateAsync({ name, email, password });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registrierung fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.25em] text-orange-400">Fitness Neu</p>
      <h1 className="mt-2 text-3xl font-semibold">Konto erstellen</h1>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="password">Passwort (min. 8 Zeichen)</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" disabled={register.isPending}>
          {register.isPending ? "Wird erstellt…" : "Registrieren"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link className="text-orange-300" to="/login">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
