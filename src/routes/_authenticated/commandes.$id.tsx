import { clientName, articleLabel, RECEIPT_THANKS } from "@/lib/article-language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusBadge, Pill } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPLAINT_TYPES, LOCKERS, METHOD_LABEL, dateFr, dateTimeFr, fcfa, orderNo, paymentStatus, type PayMethod } from "@/lib/format";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-hysope.jpg.asset.json";
import newLogoAsset from "@/assets/logo-hysope-pressing.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/commandes/$id")({
  validateSearch: z.object({ print: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Commande — Hysope Manager" }, { name: "description", content: "Commande du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:title", content: "Commande — Hysope Manager" }, { property: "og:description", content: "Commande du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrderPage,
});

function MethodPicker({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)} className={cn("rounded-lg border p-2 text-xs", value === m && "border-primary bg-primary/10 font-semibold")}>{METHOD_LABEL[m]}</button>
      ))}
    </div>
  );
}

function OrderPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = !!me?.isAdmin;
  const printed = useRef(false);
  const [printOk, setPrintOk] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [o, items, pays, reqs, comps, occ, settings, extra] = await Promise.all([
        supabase.from("order_summary").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
        supabase.from("order_requests").select("*").eq("order_id", id).order("requested_at", { ascending: false }),
        supabase.from("complaints").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("orders").select("id,locker_code,order_items(quantity)").in("status", ["pret", "a_livrer"]).not("locker_code", "is", null),
        supabase.from("settings").select("*").eq("key", "livreur_defaut").maybeSingle(),
        supabase.from("orders").select("receipt_type,notes,clients(title,is_pro,establishment_type,contact_person,contact_phone)").eq("id", id).single(),
      ]);
      if (o.error) throw o.error;
      return {
        extra: extra.data,
        o: o.data, items: items.data ?? [], pays: pays.data ?? [], reqs: reqs.data ?? [], comps: comps.data ?? [],
        used: (occ.data ?? []).filter((x) => x.id !== id).reduce((m, x) => m.set(x.locker_code!, (m.get(x.locker_code!) ?? 0) + Math.ceil(x.order_items.reduce((a, i) => a + i.quantity, 0) / 7)), new Map<string, number>()), defaultDeliverer: (settings.data?.value as string) ?? "",
      };
    },
  });

  useEffect(() => {
    if (search.print && data && !printed.current) {
      printed.current = true;
      setTimeout(() => { window.print(); setPrintOk(true); }, 400);
    }
  }, [search.print, data]);

  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["orders"] }); };
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    if (error) toast.error(error.message); else { toast.success(ok); refresh(); }
  };

  // state
  const [storage, setStorage] = useState<"casier" | "sac">("casier");
  const [locker, setLocker] = useState("");
  const [payAmt, setPayAmt] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>("especes");
  const [receipt, setReceipt] = useState(true);
  const [deliverer, setDeliverer] = useState("");
  const [req, setReq] = useState({ kind: "reduction" as "reduction" | "annulation", amount: 0, percent: 0, reason: "" });
  const [comp, setComp] = useState({ item: "", type: COMPLAINT_TYPES[1], description: "" });

  if (!data) return <p className="text-muted-foreground">Chargement…</p>;
  const { o, items, pays, reqs, comps } = data;
  const cl = data.extra?.clients;
  const isPro = data.extra?.receipt_type === "pro";
  const waText = encodeURIComponent(`PRESSING L'HYSOPE — Reçu ${orderNo(o.number)}\nClient : ${clientName(o.client_name)}\n${items.map((i) => `${i.quantity} × ${articleLabel(i)} : ${fcfa(i.quantity * i.unit_price)}`).join("\n")}\nTotal : ${fcfa(o.final_total)}\nPayé : ${fcfa(o.paid)}\nReste : ${fcfa(o.balance)}\n${RECEIPT_THANKS}`);
  const waPhone = (o.client_phone ?? "").replace(/\D/g, "");
  const balance = o.balance ?? 0;
  const active = o.status !== "annule";

  async function markReady() {
    let patch: { status: "pret" | "a_livrer"; ready_at: string; locker_code?: string | null; bag_code?: string | null; deliverer?: string } = {
      status: o.delivery_mode === "livraison" ? "a_livrer" : "pret", ready_at: new Date().toISOString(),
    };
    if (storage === "casier") {
      if (!locker) return void toast.error("Choisissez un casier");
      patch.locker_code = locker;
    } else {
      const { data: code } = await supabase.rpc("next_bag_code");
      patch.bag_code = code as string;
    }
    if (o.delivery_mode === "livraison") patch.deliverer = data!.defaultDeliverer;
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return void toast.error(error.message);
    await run(() => supabase.from("order_items").update({ ready: true }).eq("order_id", id).eq("ready", false), "Vêtements prêts");
  }

  async function toggleItem(itemId: string, ready: boolean) {
    await run(() => supabase.from("order_items").update({ ready }).eq("id", itemId), ready ? "Vêtement prêt" : "Vêtement remis en traitement");
  }
  const myLots = Math.max(1, Math.ceil(items.reduce((a, i) => a + i.quantity, 0) / 7));
  const needsPlace = o.status === "en_cours" || ((o.status === "pret" || o.status === "a_livrer") && !o.locker_code && !o.bag_code);
  const editableItems = o.status === "en_cours" || o.status === "pret" || o.status === "a_livrer";

  async function addPayment(context: "retrait" | "livraison" | "depot", amount: number) {
    if (amount <= 0) return true;
    const { error } = await supabase.from("payments").insert({ order_id: id, amount, method: payMethod, context, deliverer: context === "livraison" ? o.deliverer : null });
    if (error) { toast.error(error.message); return false; }
    return true;
  }

  async function withdraw() {
    if (payAmt < balance && !confirm(`Il reste ${fcfa(balance - payAmt)} à payer. Remettre quand même la commande ?`)) return;
    if (!(await addPayment("retrait", payAmt))) return;
    await run(() => supabase.from("orders").update({
      status: "retire", withdrawn_at: new Date().toISOString(), withdrawn_by: (me?.id ?? null), receipt_presented: receipt, locker_code: null,
    }).eq("id", id), "Retrait enregistré — casier libéré");
  }

  async function delivered() {
    if (!(await addPayment("livraison", payAmt))) return;
    await run(() => supabase.from("orders").update({ status: "livre", delivered_at: new Date().toISOString(), locker_code: null }).eq("id", id), "Livraison enregistrée");
  }

  async function decide(r: (typeof reqs)[number], approve: boolean) {
    if (approve) {
      if (r.kind === "reduction") {
        const disc = r.amount ?? Math.round(((o.total ?? 0) * Number(r.percent ?? 0)) / 100);
        const { error } = await supabase.from("orders").update({ discount: disc }).eq("id", id);
        if (error) return void toast.error(error.message);
        await supabase.from("order_requests").update({ status: "approuvee", decided_by: (me?.id ?? null), decided_at: new Date().toISOString(), final_total: (o.total ?? 0) - disc }).eq("id", r.id);
      } else {
        const { error } = await supabase.from("orders").update({ status: "annule", cancel_reason: r.reason, locker_code: null }).eq("id", id);
        if (error) return void toast.error(error.message);
        await supabase.from("order_requests").update({ status: "approuvee", decided_by: (me?.id ?? null), decided_at: new Date().toISOString() }).eq("id", r.id);
      }
    } else {
      await supabase.from("order_requests").update({ status: "refusee", decided_by: (me?.id ?? null), decided_at: new Date().toISOString() }).eq("id", r.id);
    }
    toast.success(approve ? "Demande approuvée" : "Demande refusée");
    refresh();
  }

  return (
    <div>
      <PageHeader
        title={`Commande ${orderNo(o.number)}`}
        subtitle={`${clientName(o.client_name)} · ${o.client_phone ?? ""} · déposée le ${dateTimeFr(o.created_at)}`}
        actions={<>{!isPro && <span className="no-print mr-1 self-center rounded-lg border bg-card px-3 py-2 text-xs font-semibold">Format A5 paysage</span>}<Button variant="outline" onClick={() => { window.print(); setPrintOk(true); }}><Printer className="mr-2 h-4 w-4" />{printOk ? "Réimprimer" : "Imprimer le reçu"}</Button><Button variant="outline" asChild><a href={`https://wa.me/${waPhone.length === 10 ? "225" + waPhone : waPhone}?text=${waText}`} target="_blank" rel="noreferrer">Envoyer par WhatsApp</a></Button></>}
      />
      {printOk && <div className="no-print mb-4 rounded-lg bg-success/15 p-3 text-sm font-medium text-success">Fenêtre d’impression ouverte.</div>}

      <div className="no-print grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Statut</div><StatusBadge status={o.status!} /></div>
              <div><div className="text-xs text-muted-foreground">Emplacement</div><div className="font-mono text-lg font-bold">{o.locker_code ?? o.bag_code ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Retrait prévu</div><div className="font-semibold">{dateFr(o.pickup_date)}</div></div>
              <div><div className="text-xs text-muted-foreground">Mode</div><div className="font-semibold">{o.delivery_mode === "livraison" ? "Livraison" : "Retrait au pressing"}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vêtements</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th>Qté</th><th>Désignation</th><th>Couleurs</th><th className="text-right">P.U.</th><th className="text-right">Total</th><th className="no-print pl-2">État</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="py-2">{i.quantity}</td>
                      <td>{articleLabel(i, false)}{i.observation && <div className="text-xs text-muted-foreground">⚠ {i.observation}</div>}</td>
                      <td className="text-xs">{i.colors.map((color) => articleLabel({ ...i, designation: "", singular_name: "", plural_name: "", colors: [color] }).trim()).join(", ")}</td>
                      <td className="text-right">{fcfa(i.unit_price)}</td>
                      <td className="text-right font-semibold">{fcfa(i.quantity * i.unit_price)}</td>
                      <td className="no-print pl-2">
                        <button disabled={!editableItems} onClick={() => toggleItem(i.id, !i.ready)}
                          className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold disabled:opacity-60", i.ready ? "border-success bg-success/15 text-success" : "border-warning bg-warning/20")}>
                          {i.ready ? "✓ Prêt" : "En cours"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Total</span><span>{fcfa(o.total)}</span></div>
                {!!o.discount && <div className="flex justify-between text-success"><span>Réduction</span><span>−{fcfa(o.discount)}</span></div>}
                <div className="flex justify-between"><span>Payé</span><span>{fcfa(o.paid)}</span></div>
                <div className="flex justify-between text-base font-bold"><span>Reste à payer</span><span>{fcfa(balance)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Paiements</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!pays.length && <p className="text-muted-foreground">Aucun paiement.</p>}
              {pays.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
                  <span>{dateTimeFr(p.created_at)} · {METHOD_LABEL[p.method]} · {p.context}{p.deliverer && ` (livreur : ${p.deliverer})`}</span>
                  <span className="flex items-center gap-2 font-semibold">{fcfa(p.amount)}
                    {p.context === "livraison" && p.method === "especes" && (p.cash_confirmed_at
                      ? <Pill tone="success">Espèces remises</Pill>
                      : <Button size="sm" variant="outline" onClick={() => run(() => supabase.from("payments").update({ cash_confirmed_by: (me?.id ?? null), cash_confirmed_at: new Date().toISOString() }).eq("id", p.id), "Espèces remises confirmées")}>Confirmer « Espèces remises »</Button>)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Demandes & réclamations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {reqs.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2">
                  <span>{r.kind === "reduction" ? `Réduction ${r.amount ? fcfa(r.amount) : `${r.percent} %`}` : "Annulation"} — {r.reason} <span className="text-muted-foreground">({dateTimeFr(r.requested_at)})</span></span>
                  {r.status === "en_attente" ? (isAdmin ? (
                    <span className="flex gap-2"><Button size="sm" onClick={() => decide(r, true)}>Approuver</Button><Button size="sm" variant="outline" onClick={() => decide(r, false)}>Refuser</Button></span>
                  ) : <Pill tone="warning">En attente</Pill>) : <Pill tone={r.status === "approuvee" ? "success" : "destructive"}>{r.status === "approuvee" ? "Approuvée" : "Refusée"}</Pill>}
                </div>
              ))}
              {comps.map((c) => (
                <div key={c.id} className="rounded-lg border p-2"><b>{c.type}</b> {c.item && `· ${c.item}`} — {c.description} <Pill>{c.status}</Pill></div>
              ))}
              {active && (
                <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
                  <form className="space-y-2" onSubmit={async (e) => {
                    e.preventDefault();
                    if (req.kind === "annulation" && !req.reason.trim()) return void toast.error("Motif obligatoire");
                    await run(() => supabase.from("order_requests").insert({ order_id: id, kind: req.kind, amount: req.amount || null, percent: req.percent || null, reason: req.reason, initial_total: o.total }), "Demande envoyée aux administrateurs");
                  }}>
                    <Label>Demande à un administrateur</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-2" value={req.kind} onChange={(e) => setReq({ ...req, kind: e.target.value as "reduction" })}>
                      <option value="reduction">Réduction</option><option value="annulation">Annulation</option>
                    </select>
                    {req.kind === "reduction" && <div className="flex gap-2"><Input type="number" placeholder="Montant F" onChange={(e) => setReq({ ...req, amount: +e.target.value, percent: 0 })} /><Input type="number" placeholder="ou %" onChange={(e) => setReq({ ...req, percent: +e.target.value, amount: 0 })} /></div>}
                    <Input placeholder="Motif" value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} />
                    <Button size="sm" variant="secondary">Envoyer la demande</Button>
                  </form>
                  <form className="space-y-2" onSubmit={async (e) => {
                    e.preventDefault();
                    await run(() => supabase.from("complaints").insert({ order_id: id, ...comp, type: comp.type ?? "autre" }), "Réclamation enregistrée");
                    setComp({ ...comp, item: "", description: "" });
                  }}>
                    <Label>Nouvelle réclamation</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-2" value={comp.type} onChange={(e) => setComp({ ...comp, type: e.target.value })}>
                      {COMPLAINT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <Input placeholder="Vêtement concerné" value={comp.item} onChange={(e) => setComp({ ...comp, item: e.target.value })} />
                    <Textarea placeholder="Description" value={comp.description} onChange={(e) => setComp({ ...comp, description: e.target.value })} />
                    <Button size="sm" variant="secondary">Enregistrer</Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {needsPlace && (
            <Card className="border-primary">
              <CardHeader><CardTitle>{o.status === "en_cours" ? "OK — Vêtements prêts" : "Ranger la commande"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["casier", "sac"] as const).map((s) => <button key={s} onClick={() => setStorage(s)} className={cn("rounded-lg border p-2 text-sm", storage === s && "border-primary bg-primary/10 font-semibold")}>{s === "casier" ? "Casier" : "Sac (grosse commande)"}</button>)}
                </div>
                {storage === "casier" && (
                  <div className="grid grid-cols-8 gap-1">
                    {LOCKERS.map((l) => (
                      <button key={l} disabled={(data.used.get(l) ?? 0) + myLots > 12} onClick={() => setLocker(l)} title={`${data.used.get(l) ?? 0}/12 lots`}
                        className={cn("rounded border py-1 font-mono text-xs disabled:bg-muted disabled:text-muted-foreground/50", (data.used.get(l) ?? 0) > 0 && "bg-primary/10", locker === l && "border-primary bg-primary text-primary-foreground")}>{l.slice(1)}<div className="text-[9px] opacity-70">{data.used.get(l) ?? 0}/12</div></button>
                    ))}
                  </div>
                )}
                {storage === "casier" && <p className="text-xs text-muted-foreground">Cette commande occupe {myLots} lot(s) de 7 vêtements. Chaque casier : 12 lots max.</p>}
                {storage === "sac" && <p className="text-sm text-muted-foreground">Un numéro de sac (S-001, S-002…) sera attribué automatiquement.</p>}
                <Button className="w-full" onClick={markReady}>Marquer prêt {storage === "casier" && locker && `→ ${locker}`}</Button>
              </CardContent>
            </Card>
          )}

          {o.status === "pret" && !needsPlace && (
            <Card className="border-primary">
              <CardHeader><CardTitle>Retrait au pressing</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Emplacement : <b className="font-mono text-lg">{o.locker_code ?? o.bag_code}</b></p>
                <p className="text-sm">Reste à payer : <b>{fcfa(balance)}</b></p>
                {balance > 0 && <><Label>Montant encaissé</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(+e.target.value)} onFocus={() => !payAmt && setPayAmt(balance)} /><MethodPicker value={payMethod} onChange={setPayMethod} /></>}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} />Le client a présenté son reçu</label>
                <Button className="w-full" onClick={withdraw}>Enregistrer le retrait</Button>
              </CardContent>
            </Card>
          )}

          {o.status === "a_livrer" && (
            <Card className="border-primary">
              <CardHeader><CardTitle>Livraison</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{o.client_address} · {o.client_quartier}</p>
                <Label>Livreur affecté</Label>
                <div className="flex gap-2">
                  <Input defaultValue={o.deliverer ?? ""} onChange={(e) => setDeliverer(e.target.value)} />
                  <Button variant="outline" onClick={() => run(() => supabase.from("orders").update({ deliverer }).eq("id", id), "Livreur modifié")}>OK</Button>
                </div>
                <p>Reste à payer : <b>{fcfa(balance)}</b></p>
                {balance > 0 && <><Label>Montant reçu par le livreur</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(+e.target.value)} /><MethodPicker value={payMethod} onChange={setPayMethod} /></>}
                <Button className="w-full" onClick={delivered}>Marquer livré</Button>
              </CardContent>
            </Card>
          )}

          {active && balance > 0 && o.status === "en_cours" && (
            <Card>
              <CardHeader><CardTitle>Encaisser un paiement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input type="number" value={payAmt} onChange={(e) => setPayAmt(+e.target.value)} />
                <MethodPicker value={payMethod} onChange={setPayMethod} />
                <Button className="w-full" variant="secondary" onClick={async () => { if (payAmt > balance) return void toast.error("Montant supérieur au solde"); if (await addPayment("depot", payAmt)) { toast.success("Paiement enregistré"); setPayAmt(0); refresh(); } }}>Enregistrer</Button>
              </CardContent>
            </Card>
          )}

          {isAdmin && active && (
            <Card>
              <CardHeader><CardTitle>Actions administrateur</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="destructive" className="w-full" onClick={() => {
                  const reason = prompt("Motif de l'annulation (obligatoire)");
                  if (!reason?.trim()) return;
                  run(() => supabase.from("orders").update({ status: "annule", cancel_reason: reason, locker_code: null }).eq("id", id), "Commande annulée");
                }}>Annuler la commande</Button>
              </CardContent>
            </Card>
          )}
          {o.status === "annule" && <Card><CardContent className="p-5 text-sm text-destructive">Commande annulée : {o.cancel_reason}</CardContent></Card>}
          <Link to="/clients/$id" params={{ id: o.client_id! }} className="block text-sm text-primary underline">Voir la fiche client</Link>
        </div>
      </div>

      {/* Reçu ½ A4 */}
      {isPro ? (
        <div className="print-area mt-8 border-t bg-card print:mt-0 print:border-0">
          <style>{`@page { size: A4 portrait; margin: 10mm; }`}</style>
          <div className="relative isolate overflow-hidden border p-6 text-[11px] text-foreground" style={{ minHeight: "270mm" }}>
            <img src={logoAsset.url} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120mm] w-[120mm] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" style={{ opacity: 0.08, filter: "grayscale(1) sepia(1) hue-rotate(180deg) saturate(2.5) brightness(1.3)", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
            <div className="flex items-start justify-between border-b-2 border-primary pb-3">
              <div className="flex items-center gap-3">
                <img src={logoAsset.url} alt="Logo" className="h-16 w-16 rounded-full object-cover" />
                <div><div className="font-display text-2xl font-bold">PRESSING L'HYSOPE</div><div>Yopougon Ananeraie · Tél. : 07 08 52 11 44 / 05 45 51 92 36</div></div>
              </div>
              <div className="text-right"><div className="text-xs uppercase tracking-wide">Facture / reçu professionnel</div><div className="text-xl font-bold">{orderNo(o.number)}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="rounded border p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Établissement</div>
                <div className="text-sm font-bold">{clientName(o.client_name)}</div>
                {cl?.establishment_type && <div>{cl.establishment_type}</div>}
                {o.client_phone && <div>Tél. : {o.client_phone}</div>}
                {cl?.contact_person && <div>Responsable : {clientName(cl.contact_person)}{cl.contact_phone ? ` — ${cl.contact_phone}` : ""}</div>}
              </div>
              <div className="rounded border p-2">
                <div>Date de dépôt : <b>{dateFr(o.created_at)}</b></div>
                <div>{o.delivery_mode === "livraison" ? "Livraison prévue" : "Retrait prévu"} : <b>{dateFr(o.pickup_date)}</b></div>
                <div>Nombre d'articles : <b>{items.reduce((s, i) => s + i.quantity, 0)}</b></div>
              </div>
            </div>
            <table className="mt-3 w-full border-collapse">
              <thead><tr className="bg-secondary"><th className="border p-1 text-left">DÉSIGNATION</th><th className="border p-1 text-right">QTÉ</th><th className="border p-1 text-right">PRIX UNITAIRE</th><th className="border p-1 text-right">MONTANT</th></tr></thead>
              <tbody>{items.map((i) => <tr key={i.id}><td className="border p-1">{articleLabel(i)}{i.observation && ` (${i.observation})`}</td><td className="border p-1 text-right">{i.quantity}</td><td className="border p-1 text-right">{fcfa(i.unit_price)}</td><td className="border p-1 text-right">{fcfa(i.quantity * i.unit_price)}</td></tr>)}</tbody>
            </table>
            <div className="mt-3 ml-auto w-72 space-y-0.5 rounded border p-2">
              <div className="flex justify-between text-sm"><span>Total prestation</span><b>{fcfa(o.final_total)}</b></div>
              <div className="flex justify-between"><span>Montant payé / avance</span><span>{fcfa(o.paid)}</span></div>
              <div className="flex justify-between text-sm"><span>Reste à payer</span><b>{fcfa(balance)}</b></div>
              <div className="flex justify-between"><span>Mode de paiement</span><span>{[...new Set(pays.map((p) => METHOD_LABEL[p.method]))].join(", ") || "—"}</span></div>
            </div>
            <div className="mt-3 rounded border p-2" style={{ minHeight: "20mm" }}><div className="text-[10px] uppercase text-muted-foreground">Observations</div>{data.extra?.notes}</div>
            <div className="mt-6 grid grid-cols-2 gap-8 text-center">
              <div><div className="border-b" style={{ height: "18mm" }} />Signature du pressing</div>
              <div><div className="border-b" style={{ height: "18mm" }} />Signature du client</div>
            </div>
            <p className="mt-6 border-t pt-3 text-center text-[10px]">{RECEIPT_THANKS}</p>
          </div>
        </div>
      ) : (
      <div className="print-area mt-8 border-t bg-card print:mt-0 print:border-0">
        <style>{`@page { size: A5 landscape; margin: 5mm; } @media print { .receipt-a5 { margin: 0 !important; } }`}</style>
        <div className="overflow-x-auto py-4 print:overflow-visible print:p-0">
        <div className="receipt-a5 relative isolate mx-auto flex h-[138mm] w-[200mm] shrink-0 flex-col overflow-hidden rounded-md border-2 border-primary bg-card px-[4mm] py-[3mm] text-[9.5px] leading-tight text-foreground" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
          <img src={newLogoAsset.url} alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-[38mm] -z-10 mx-auto h-[75mm] w-[75mm] rounded-full object-cover" style={{ opacity: 0.08 }} />
          <div className="grid grid-cols-[22mm_1fr_64mm] items-start gap-[3mm]">
            <img src={newLogoAsset.url} alt="Logo Pressing L'Hysope" className="h-[22mm] w-[22mm] rounded-full object-cover" />
            <div>
              <div className="font-display text-base font-bold text-primary">PRESSING L'HYSOPE</div>
              <div>📍 Yopougon Ananeraie</div>
              <div className="text-[12px] font-bold text-primary">📞 07 57 32 14 89</div>
              <div>07 08 52 11 44 / 05 45 51 92 36</div>
              <div className="mt-1 grid grid-cols-3 gap-x-2 gap-y-0.5 text-[8px]">{["Teinture industrielle", "Nettoyage à sec", "Stoppage", "Amidonnage", "Traitements spéciaux", "Express"].map((s) => <span key={s}>▢ {s}</span>)}</div>
            </div>
            <div className="text-right">
              <p className="rounded-md border border-primary bg-secondary p-1.5 text-center text-[8px] font-semibold uppercase leading-tight"><span className="mb-0.5 block text-[9px] text-primary">Important</span>Passé le délai d'un mois, plus de garantie du pressing et un montant de 100 F est perçu par jour pour frais de magasinage.</p>
              <div className="mt-1 text-base font-bold leading-none"><span className="text-destructive">{orderNo(o.number)}</span></div>
              <div>Date : {dateFr(o.created_at)}</div>
            </div>
          </div>
          <div className="mt-1.5 grid grid-cols-[1.4fr_1fr] gap-3 border-b border-dotted border-primary pb-1">
            <div>Nom du client : <b>{cl?.title ? `${cl.title} ` : ""}{clientName(o.client_name)}</b></div>
            <div>Contact : <b>{o.client_phone}</b></div>
          </div>
          <table className="mt-1 w-full table-fixed border-collapse border border-primary [&_td]:border-x [&_td]:border-primary [&_td]:px-1.5 [&_td]:py-0.5">
            <thead><tr className="bg-primary text-primary-foreground [&_th]:px-1.5 [&_th]:py-1"><th className="w-[20mm] text-center">QUANTITÉ</th><th className="text-center tracking-[0.2em]">DÉSIGNATION</th><th className="w-[28mm] text-right">PRIX UNITAIRE</th><th className="w-[28mm] text-right">PRIX TOTAL</th></tr></thead>
            <tbody>
              {items.map((i) => <tr key={i.id} className={cn("border-b border-primary/30", items.length > 10 ? "h-[4mm]" : "h-[5.5mm]")}><td className="text-center">{i.quantity}</td><td className="truncate">{articleLabel(i)}{i.observation && ` (${i.observation})`}</td><td className="text-right">{fcfa(i.unit_price)}</td><td className="text-right">{fcfa(i.quantity * i.unit_price)}</td></tr>)}
              {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, k) => <tr key={`v${k}`} className="h-[5.5mm] border-b border-primary/30"><td /><td /><td /><td /></tr>)}
            </tbody>
          </table>
          <div className="flex-1" />
          <div className="grid grid-cols-[1fr_56mm] border-x border-b border-primary">
            <div className="grid grid-cols-[auto_repeat(6,1fr)] text-center text-[9px] [&>div]:border-r [&>div]:border-primary [&>div]:px-1">
              <div className="row-span-2 flex flex-col justify-center bg-secondary font-bold">DATE DE<br />RETRAIT</div>
              {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((d) => <div key={d} className="border-b border-primary">{d}</div>)}
              <div className="col-span-6 py-0.5 text-left">Prévu le <b>{dateFr(o.pickup_date)}</b></div>
            </div>
            <div className="px-2 py-0.5">
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>{fcfa(o.final_total)}</span></div>
              <div className="flex justify-between"><span>Avance / payé</span><span>{fcfa(o.paid)}</span></div>
              <div className="flex justify-between"><span>Solde · {paymentStatus(o.final_total ?? 0, o.paid ?? 0)}</span><b>{fcfa(balance)}</b></div>
            </div>
          </div>
          <p className="mt-1 text-[7.3px] leading-snug"><b className="underline">Conditions :</b> les vêtements ne seront retirés qu'après traitement. Les vêtements dont les couleurs ne sont pas stables ne sont pris en compte qu'après traitement. En cas de perte ou de dégâts d'un article, la responsabilité du pressing ne peut être engagée que pour un montant équivalent à 1 fois la valeur de nettoyage de l'article. Les fermetures, boutons et accessoires en matières plastiques ne sont pas pris en compte. Les vêtements mal traités seront repris sans facture. Présentez ce reçu pour retirer vos vêtements ; toute réclamation se fait au moment du retrait.</p>
          <div className="flex items-center justify-between text-[8.5px]"><span>{RECEIPT_THANKS}</span><i className="font-display font-semibold text-primary">Propreté – Rapidité – Efficacité</i></div>
        </div>
        </div>
      </div>
      )}
    </div>
  );
}
