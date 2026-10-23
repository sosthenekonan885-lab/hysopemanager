import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fcfa, dateTimeFr } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/tarifs")({
  head: () => ({ meta: [{ title: "Tarifs — Hysope Manager" }] }),
  component: Tarifs,
});

function Tarifs() {
  const { data: me } = useMe();
  const admin = !!me?.isAdmin;
  const [newCat, setNewCat] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["tarifs"],
    queryFn: async () => {
      const [c, h] = await Promise.all([
        supabase.from("price_categories").select("*, services(*)").order("sort"),
        supabase.from("price_history").select("*, services(name)").order("changed_at", { ascending: false }).limit(20),
      ]);
      return { cats: c.data ?? [], hist: h.data ?? [] };
    },
  });
  const err = (e: { message: string } | null) => (e ? toast.error(e.message) : (toast.success("Enregistré"), refetch()));

  return (
    <div>
      <PageHeader title="Tarifs" subtitle="Un changement de prix ne modifie jamais les anciennes commandes." />
      {admin && (
        <form className="mb-6 flex max-w-md gap-2" onSubmit={async (e) => { e.preventDefault(); err((await supabase.from("price_categories").insert({ name: newCat, sort: 99 })).error); setNewCat(""); }}>
          <Input placeholder="Nouvelle catégorie" value={newCat} onChange={(e) => setNewCat(e.target.value)} required />
          <Button variant="secondary">Créer</Button>
        </form>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.cats.map((c) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="text-base">{c.name}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {c.services.sort((a, b) => a.sort - b.sort).map((s) => (
                <div key={s.id} className={`flex items-center gap-2 text-sm ${s.active ? "" : "opacity-50"}`}>
                  <span className="flex-1">{s.name}</span>
                  {admin ? (
                    <Input type="number" className="h-8 w-24" defaultValue={s.price ?? ""} placeholder="Variable"
                      onBlur={async (e) => { const v = e.target.value === "" ? null : +e.target.value; if (v !== s.price) err((await supabase.from("services").update({ price: v }).eq("id", s.id)).error); }} />
                  ) : <span className="font-semibold">{s.price == null ? "Selon la taille" : s.price_max ? `${fcfa(s.price)} – ${fcfa(s.price_max)}` : fcfa(s.price)}</span>}
                  {admin && <button className="text-xs text-primary underline" onClick={async () => err((await supabase.from("services").update({ active: !s.active }).eq("id", s.id)).error)}>{s.active ? "Désactiver" : "Réactiver"}</button>}
                </div>
              ))}
              {admin && (
                <form className="flex gap-2 pt-2" onSubmit={async (e) => {
                  e.preventDefault(); const f = new FormData(e.currentTarget);
                  const price = f.get("price") ? Number(f.get("price")) : null;
                  err((await supabase.from("services").insert({ category_id: c.id, name: String(f.get("name")), price, variable: price == null, sort: 99 })).error);
                  e.currentTarget.reset();
                }}>
                  <Input name="name" placeholder="Nouveau service" className="h-8" required />
                  <Input name="price" type="number" placeholder="Prix" className="h-8 w-24" />
                  <Button size="sm" variant="secondary">+</Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Historique des modifications</h2>
      <div className="space-y-1 text-sm">
        {data?.hist.map((h) => <div key={h.id} className="rounded border bg-card p-2">{dateTimeFr(h.changed_at)} · {h.services?.name} : {h.old_price == null ? "variable" : fcfa(h.old_price)} → <b>{h.new_price == null ? "variable" : fcfa(h.new_price)}</b></div>)}
        {!data?.hist.length && <Pill>Aucune modification</Pill>}
      </div>
    </div>
  );
}
