// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { changeOwnPassword } from "@/lib/auth.functions";
import { PageHeader } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — Hysope Manager" }] }),
  component: Account,
});

function Account() {
  const { data: me } = useMe();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  return (
    <div className="max-w-md">
      <PageHeader title="Mon compte" subtitle={`${me?.profile?.full_name ?? ""} · @${me?.profile?.username ?? ""}`} />
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (f.next !== f.confirm) return toast.error("Les mots de passe ne correspondent pas");
        try { await changeOwnPassword({ data: { current: f.current, next: f.next } }); toast.success("Mot de passe modifié"); setF({ current: "", next: "", confirm: "" }); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
      }}>
        <div className="space-y-1"><Label>Mot de passe actuel</Label><Input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></div>
        <div className="space-y-1"><Label>Nouveau mot de passe</Label><Input type="password" minLength={6} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required /></div>
        <div className="space-y-1"><Label>Confirmer</Label><Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></div>
        <Button>Changer le mot de passe</Button>
      </form>
    </div>
  );
}
