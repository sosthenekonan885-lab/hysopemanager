import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createStaffUser, manageUser } from "@/lib/auth.functions";
import { PageHeader, Pill, AdminOnly } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Users /></AdminOnly>; },
});

function Users() {
  const [f, setF] = useState({ username: "", full_name: "", password: "", role: "gerante" as "admin" | "gerante" });
  const { data, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (p.data ?? []).map((u) => ({ ...u, admin: (r.data ?? []).some((x) => x.user_id === u.id && x.role === "admin") }));
    },
  });
  const act = async (userId: string, action: "unlock" | "deactivate" | "activate" | "reset_password" | "rename", current?: string) => {
    let password: string | undefined;
    let full_name: string | undefined;
    if (action === "rename") { full_name = prompt("Nouveau nom affiché", current ?? "")?.trim() || undefined; if (!full_name) return; }
    if (action === "reset_password") { password = prompt("Nouveau mot de passe (6 caractères minimum)") ?? undefined; if (!password) return; }
    try { await manageUser({ data: { userId, action, password, full_name } }); toast.success("Fait"); refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };
  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Les comptes ne sont jamais supprimés, seulement désactivés." />
      <form className="mb-6 grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-5" onSubmit={async (e) => {
        e.preventDefault();
        try { await createStaffUser({ data: f }); toast.success("Compte créé"); setF({ ...f, username: "", full_name: "", password: "" }); refetch(); } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
      }}>
        <Input placeholder="Nom complet" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
        <Input placeholder="Identifiant" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
        <Input placeholder="Mot de passe" type="password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <select className="h-10 rounded-md border bg-background px-2" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as "admin" })}>
          <option value="gerante">Gérante</option><option value="admin">Administrateur</option>
        </select>
        <Button>Créer le compte</Button>
      </form>
      <div className="space-y-2">
        {data?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div>
              <b>{u.full_name}</b> <span className="text-sm text-muted-foreground">@{u.username}</span>{" "}
              <Pill tone={u.admin ? "info" : "muted"}>{u.admin ? "Administrateur" : "Gérante"}</Pill>{" "}
              {u.locked && <Pill tone="destructive">Bloqué</Pill>} {!u.active && <Pill tone="warning">Désactivé</Pill>}
            </div>
            <div className="flex gap-2">
              {u.locked && <Button size="sm" onClick={() => act(u.id, "unlock")}>Débloquer</Button>}
              <Button size="sm" variant="outline" onClick={() => act(u.id, "rename", u.full_name)}>Modifier le nom</Button>
              <Button size="sm" variant="outline" onClick={() => act(u.id, "reset_password")}>Réinitialiser le mot de passe</Button>
              <Button size="sm" variant="ghost" onClick={() => act(u.id, u.active ? "deactivate" : "activate")}>{u.active ? "Désactiver" : "Réactiver"}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
