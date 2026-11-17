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
import { dateFr, fcfa, orderNo, paymentStatus } from "@/lib/format";
import { clientName, articleLabel } from "@/lib/article-language";
import { PartnerPrices } from "@/components/hysope/PartnerPrices";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — Hysope Manager" }, { name: "description", content: "Fiche client du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:title", content: "Fiche client — Hysope Manager" }, { property: "og:description", content: "Fiche client du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ClientPage,
});

function ClientPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const { data, refetch } = useQuery({
    queryKey: ["client-full", id],
    queryFn: async () => {
      const [c, o, comps, articles, details] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("order_summary").select("*").eq("client_id", id).order("number", { ascending: false }),
        supabase.from("complaints").select("*, orders!inner(client_id, number)").eq("orders.client_id", id),
        supabase.from("order_items").select("*, orders!inner(client_id)").eq("orders.client_id", id),
        supabase.from("orders").select("id,withdrawn_at,delivered_at").eq("client_id", id),
      ]);
      if (c.error) throw c.error; if (o.error) throw o.error; if (articles.error) throw articles.error;
      return { c: c.data, orders: o.data ?? [], comps: comps.data ?? [], articles: articles.data ?? [], details: details.data ?? [] };
    },
  });
  if (!data?.c) return <p>Chargement…</p>;
  const { c, orders, comps } = data;
  const valid = orders.filter((o) => o.status !== "annule");
  const spent = valid.reduce((s, o) => s + (o.paid ?? 0), 0);

  async function save() {
    if (!edit) return;
    const { error } = await supabase.from("clients").update({ ...edit, name: clientName(edit.name) }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Fiche mise à jour"); setEdit(null); refetch(); }
  }

  return (
    <div>
      <PageHeader title={clientName(c.name)} subtitle={`${c.phone ?? ""} · WhatsApp ${c.whatsapp ?? "—"} · ${c.address ?? ""} ${c.quartier ?? ""}`}
        actions={<Button asChild>{c.is_pro ? <Link to="/facturation-professionnelle" search={{ client: id }}>+ Nouvelle facture</Link> : <Link to="/commandes/nouvelle" search={{ client: id }}>+ Nouveau dépôt</Link>}</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Commandes" value={valid.length} />
        <Stat label="Montant total payé" value={fcfa(spent)} accent />
        <Stat label="En cours" value={valid.filter((o) => ["en_cours", "pret", "a_livrer"].includes(o.status ?? "")).length} />
        <Stat label="Retirées" value={valid.filter((o) => o.status === "retire").length} />
        <Stat label="Livrées" value={valid.filter((o) => o.status === "livre").length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><CardTitle>Historique des commandes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders.map((o) => {
              if (!o.id || !o.status) return null;
              const detail = data.details.find((d) => d.id === o.id);
              return <Link key={o.id} to="/commandes/$id" params={{ id: o.id }} className="block rounded-lg border p-3 hover:bg-muted">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{orderNo(o.number)}</span><StatusBadge status={o.status} /></div>
                <div className="mt-2 text-sm">{data.articles.filter((i) => i.order_id === o.id).map((i) => `${i.quantity} × ${articleLabel(i)}`).join(" · ")}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"><span>Total : {fcfa(o.final_total)}</span><span>Payé : {fcfa(o.paid)}</span><span className="font-semibold">Solde : {fcfa(o.balance)}</span><span>{paymentStatus(o.final_total ?? 0, o.paid ?? 0) === "Avance versée" ? "Partiellement payée" : paymentStatus(o.final_total ?? 0, o.paid ?? 0)}</span></div>
                <div className="mt-1 text-xs text-muted-foreground">Dépôt : {dateFr(o.created_at)} · Retrait prévu : {dateFr(o.pickup_date)} · Retrait / livraison : {dateFr(detail?.withdrawn_at ?? detail?.delivered_at)}</div>
              </Link>;
            })}
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
                  <div key={k} className="space-y-1"><Label className="capitalize">{k}</Label><Input value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: k === "name" ? clientName(e.target.value) : e.target.value })} /></div>
                ))}
                <Button onClick={save}>Enregistrer</Button>
              </>
            ) : (
              <>
                <p className="text-sm">Client depuis le {dateFr(c.created_at)}</p>
                {c.is_pro && <p className="text-sm">{c.establishment_type} · {clientName(c.contact_person)} {c.contact_phone}</p>}
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
      {c.is_pro && <PartnerPrices clientId={id} />}
    </div>
  );
}
