import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty, Stat } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateFr, dateTimeFr, fcfa, orderNo, todayISO, METHOD_LABEL, type PayMethod } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/retraits")({
  head: () => ({ meta: [
    { title: "Retraits — Hysope Manager" },
    { name: "description", content: "Journal des retraits du Pressing L'Hysope avec ou sans numéro de reçu." },
    { property: "og:title", content: "Retraits — Hysope Manager" },
    { property: "og:description", content: "Enregistrement et suivi des retraits au Pressing L'Hysope." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Withdrawals,
});

type Form = { date: string; client_name: string; receipt_no: string; amount: number; method: PayMethod | "" };
const empty = (): Form => ({ date: todayISO(), client_name: "", receipt_no: "", amount: 0, method: "" });

function PaymentSelect({ id, value, onChange }: { id: string; value: Form["method"]; onChange: (method: PayMethod) => void }) {
  return <Select required value={value} onValueChange={(method: PayMethod) => onChange(method)}>
    <SelectTrigger id={id} aria-label="Mode de paiement" aria-required="true"><SelectValue placeholder="Choisir" /></SelectTrigger>
    <SelectContent>{(Object.keys(METHOD_LABEL) as PayMethod[]).map((method) => <SelectItem key={method} value={method}>{method === "orange_money" ? "Orange Money (OM)" : METHOD_LABEL[method]}</SelectItem>)}</SelectContent>
  </Select>;
}

function Withdrawals() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [f, setF] = useState<Form>(empty());
  const [edit, setEdit] = useState<(Form & { id: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["withdrawals", from, to],
    queryFn: async () => {
      const [w, p] = await Promise.all([
        supabase.from("withdrawals").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name"),
      ]);
      if (w.error) throw w.error;
      return { rows: w.data ?? [], names: new Map((p.data ?? []).map((x) => [x.id, x.full_name])) };
    },
  });

  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["report"] }); qc.invalidateQueries({ queryKey: ["cash"] }); };

  async function lookup(no: string) {
    const n = Number(no.replace(/\D/g, ""));
    if (!n) return;
    const { data: o } = await supabase.from("order_summary").select("client_name,balance").eq("number", n).maybeSingle();
    if (o) setF((x) => ({ ...x, client_name: x.client_name || (o.client_name ?? ""), amount: x.amount || (o.balance ?? 0) }));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(f.receipt_no.replace(/\D/g, ""));
    const clientName = f.client_name.trim();
    const amount = f.amount;
    if (!clientName) return void toast.error("Nom du client requis");
    if (!f.method) return void toast.error("Mode de paiement requis");
    setBusy(true);
    const { data: o, error: lookupError } = n ? await supabase.from("orders").select("id").eq("number", n).maybeSingle() : { data: null, error: null };
    if (lookupError) { setBusy(false); return void toast.error(lookupError.message); }
    const { error } = await supabase.from("withdrawals").insert({ date: f.date, client_name: clientName, receipt_no: n || null, amount: Math.max(0, amount), order_id: o?.id ?? null, method: f.method });
    setBusy(false);
    if (error) return void toast.error(error.code === "23505" ? `Le reçu ${orderNo(n)} a déjà été retiré` : error.message);
    toast.success("Retrait enregistré");
    setF(empty()); refresh();
  }

  async function save() {
    if (!edit) return;
    const n = Number(edit.receipt_no.replace(/\D/g, ""));
    if (!edit.client_name.trim()) return void toast.error("Nom du client requis");
    if (!edit.method) return void toast.error("Mode de paiement requis");
    const { error } = await supabase.from("withdrawals").update({ date: edit.date, client_name: edit.client_name.trim(), receipt_no: n || null, amount: Math.max(0, edit.amount), method: edit.method }).eq("id", edit.id);
    if (error) return void toast.error(error.code === "23505" ? `Le reçu ${orderNo(n)} a déjà un retrait` : error.message);
    toast.success("Retrait modifié"); setEdit(null); refresh();
  }

  const rows = data?.rows ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="Retraits" subtitle="Vêtements retirés par les clients. Les retraits faits depuis une commande s'ajoutent automatiquement."
        actions={<Button variant="outline" onClick={() => window.print()}>Imprimer</Button>} />

      <Card className="no-print mb-6">
        <CardHeader><CardTitle>Enregistrer un retrait</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="withdrawal-receipt">N° du reçu (facultatif)</Label><Input id="withdrawal-receipt" placeholder="000123" value={f.receipt_no} onChange={(e) => setF({ ...f, receipt_no: e.target.value })} onBlur={(e) => lookup(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="withdrawal-name">Nom du client</Label><Input id="withdrawal-name" value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Montant payé</Label><Input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="withdrawal-method">Mode de paiement *</Label><PaymentSelect id="withdrawal-method" value={f.method} onChange={(method) => setF({ ...f, method })} /></div>
            <div className="flex items-end"><Button className="w-full" disabled={busy}>Enregistrer</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>Du</Label><Input type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label>Au</Label><Input type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="ghost" onClick={() => { setFrom(todayISO()); setTo(todayISO()); }}>Aujourd'hui</Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Nombre de retraits" value={rows.length} />
        <Stat label="Montant encaissé aux retraits" value={fcfa(total)} accent />
      </div>

      <div className="print-area">
        {!rows.length ? <Empty>Aucun retrait sur cette période.</Empty> : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Date</th><th>N° reçu</th><th>Client</th><th className="text-right">Montant payé</th><th className="px-3">Mode de paiement</th><th className="pl-3">Enregistré par</th><th className="no-print"></th></tr></thead>
              <tbody>
                {rows.map((r) => edit?.id === r.id ? (
                  <tr key={r.id} className="border-t bg-secondary/50">
                    <td className="p-2"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></td>
                    <td className="p-2"><Input value={edit.receipt_no} onChange={(e) => setEdit({ ...edit, receipt_no: e.target.value })} /></td>
                    <td className="p-2"><Input value={edit.client_name} onChange={(e) => setEdit({ ...edit, client_name: e.target.value })} /></td>
                    <td className="p-2"><Input type="number" min={0} value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: +e.target.value })} /></td>
                     <td className="min-w-40 p-2"><PaymentSelect id={`method-${r.id}`} value={edit.method} onChange={(method) => setEdit({ ...edit, method })} /></td>
                    <td colSpan={2} className="p-2"><div className="flex gap-2"><Button size="sm" onClick={save}>Enregistrer</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Annuler</Button></div></td>
                  </tr>
                ) : (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{dateFr(r.date)}</td>
                    <td>{r.order_id && r.receipt_no != null ? <Link to="/commandes/$id" params={{ id: r.order_id }} className="font-semibold text-primary">{orderNo(r.receipt_no)}</Link> : <span className="font-semibold">{r.receipt_no == null ? "—" : orderNo(r.receipt_no)}</span>}</td>
                    <td>{r.client_name}</td>
                    <td className="text-right font-semibold">{fcfa(r.amount)}</td>
                     <td className="px-3">{r.method ? METHOD_LABEL[r.method] : "Non renseigné"}</td>
                    <td className="pl-3 text-xs text-muted-foreground">
                      {data?.names.get(r.created_by ?? "") ?? "—"}
                      {r.updated_at && <div>Modifié par {data?.names.get(r.updated_by ?? "") ?? "—"} le {dateTimeFr(r.updated_at)}</div>}
                    </td>
                    <td className="no-print pr-2 text-right">
                       <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEdit({ id: r.id, date: r.date, client_name: r.client_name, receipt_no: r.receipt_no == null ? "" : String(r.receipt_no), amount: r.amount, method: r.method ?? "" })}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
