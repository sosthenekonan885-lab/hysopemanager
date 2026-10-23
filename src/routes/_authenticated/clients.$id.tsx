// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, StatusBadge } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateFr, fcfa, orderNo } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — Hysope Manager" }] }),
  component: ClientPage,
});

function ClientPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const { data, refetch } = useQuery({
    queryKey: ["client-full", id],
    queryFn: async () => {
      const [c, o, comps] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("order_summary").select("*").eq("client_id", id).order("number", { ascending: false }),
        supabase.from("complaints").select("*, orders!inner(client_id, number)").eq("orders.client_id", id),
      ]);
      return { c: c.data!, orders: o.data ?? [], comps: comps.data ?? [] };
    },
  });
  if (!data?.c) return <p>Chargement…</p>;
  const { c, orders, comps } = data;
  const valid = orders.filter((o) => o.status !== "annule");
  const spent = valid.reduce((s, o) => s + (o.paid ?? 0), 0);

  async function save() {
    const { error } = await supabase.from("clients").update(edit!).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Fiche mise à jour"); setEdit(null); refetch(); }
  }

  return (
    <div>
      <PageHeader title={c.name} subtitle={`${c.phone ?? ""} · WhatsApp ${c.whatsapp ?? "—"} · ${c.address ?? ""} ${c.quartier ?? ""}`}
        actions={<Button asChild><Link to="/commandes/nouvelle" search={{ client: id }}>+ Nouveau dépôt</Link></Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Commandes" value={valid.length} />
        <Stat label="Montant total payé" value={fcfa(spent)} accent />
        <Stat label="En cours" value={valid.filter((o) => ["en_cours", "pret", "a_livrer"].includes(o.status!)).length} />
        <Stat label="Retirées" value={valid.filter((o) => o.status === "retire").length} />
        <Stat label="Livrées" value={valid.filter((o) => o.status === "livre").length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><CardTitle>Historique des commandes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id} to="/commandes/$id" params={{ id: o.id! }} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted">
                <span className="font-semibold">{orderNo(o.number)} <span className="font-normal text-muted-foreground">· {dateFr(o.created_at)}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status!} />{fcfa(o.final_total)}</span>
              </Link>
            ))}
            {comps.length > 0 && <h3 className="pt-4 font-semibold">Réclamations</h3>}
            {comps.map((r) => <div key={r.id} className="rounded-lg border p-2 text-sm">{orderNo(r.orders.number)} — {r.type} · {r.status}</div>)}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {edit ? (
              <>
                {(["name", "phone", "whatsapp", "address", "quartier", "notes"] as const).map((k) => (
                  <div key={k} className="space-y-1"><Label className="capitalize">{k}</Label><Input value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
                ))}
                <Button onClick={save}>Enregistrer</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{c.notes || "Aucune information complémentaire."}</p>
                <Button variant="outline" onClick={() => setEdit({ name: c.name, phone: c.phone ?? "", whatsapp: c.whatsapp ?? "", address: c.address ?? "", quartier: c.quartier ?? "", notes: c.notes ?? "" })}>Modifier</Button>
              </>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <Label>Client éligible à la livraison</Label>
              <Switch checked={c.delivery_eligible} disabled={!me?.isAdmin}
                onCheckedChange={async (v) => { const { error } = await supabase.from("clients").update({ delivery_eligible: v }).eq("id", id); if (error) toast.error(error.message); refetch(); }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
