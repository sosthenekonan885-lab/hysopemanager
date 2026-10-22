import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loginWithUsername, needsSetup, setupFirstAdmin } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/hysope/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion — Hysope Manager" },
      { name: "description", content: "Accès au logiciel de gestion du Pressing L'Hysope, Yopougon Ananeraie." },
      { property: "og:title", content: "Hysope Manager" },
      { property: "og:description", content: "Logiciel de gestion du Pressing L'Hysope." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/tableau-de-bord" });
    });
    needsSetup().then((r) => setSetup(r.needsSetup)).catch(() => setSetup(false));
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        await setupFirstAdmin({ data: form });
        toast.success("Compte administrateur créé");
      }
      const r = await loginWithUsername({ data: { username: form.username, password: form.password } });
      if ("error" in r) { toast.error(r.error); return; }
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      navigate({ to: "/tableau-de-bord" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-brand p-12 text-primary-foreground lg:flex">
        <Logo light />
        <div>
          <h1 className="text-5xl font-bold leading-tight">Chaque vêtement,<br />suivi avec soin.</h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Dépôts, paiements, casiers, retraits, livraisons et caisse — tout le pressing dans un seul outil.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">Pressing L'Hysope · Yopougon Ananeraie</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-3xl font-bold">{setup ? "Première configuration" : "Connexion"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {setup ? "Créez le premier compte administrateur." : "Entrez votre identifiant et votre mot de passe."}
            </p>
          </div>
          {setup && (
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Identifiant</Label>
            <Input required autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input required type="password" minLength={setup ? 6 : 1} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={busy || setup === null}>
            {busy ? "Patientez…" : setup ? "Créer et se connecter" : "Se connecter"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Vous êtes client ? <Link to="/suivi" className="font-semibold text-primary underline">Suivre ma commande</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
