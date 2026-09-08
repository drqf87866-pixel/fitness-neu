import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/dialog";
import { useLogin } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login.mutateAsync({ email, password });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.25em] text-orange-400">Fitness Neu</p>
      <h1 className="mt-2 text-3xl font-semibold">Willkommen zurück</h1>
      <p className="mt-1 text-sm text-muted-foreground">Melde dich an, um dein Training fortzusetzen.</p>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field>
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? "Anmeldung…" : "Anmelden"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link className="text-orange-300" to="/register">
          Registrieren
        </Link>
      </p>
    </div>
  );
}
