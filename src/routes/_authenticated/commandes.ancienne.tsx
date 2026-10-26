import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fcfa, orderNo, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/commandes/ancienne")({
  head: () => ({ meta: [{ title: "Ancien reçu papier — Hysope Manager" }] }),
  component: LegacyOrder,
});

type Line = { key: number; designation: string; quantity: number; unit_price: number; ready: boolean };

function LegacyOrder() {
  const navigate = useNavigate();
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deposit, setDeposit] = useState(todayISO());
  const [pickup, setPickup] = useState(todayISO());
  const [paid, setPaid] = useState(0);
  const [lines, setLines] = useState<Line[]>([{ key: 1, designation: "", quantity: 1, unit_price: 0, ready: false }]);
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const upd = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function save() {
    const n = Number(num.replace(/\D/g, ""));
    if (!n) return void toast.error("Numéro du reçu papier requis");
    if (!name.trim()) return void toast.error("Nom du client requis");
    const items = lines.filter((l) => l.designation.trim());
    if (!items.length) return void toast.error("Ajoutez au moins un vêtement");
    if (paid < 0 || paid > total) return void toast.error("Le montant payé doit être entre 0 et le total");
    setBusy(true);
    try {
      const { data: exists } = await supabase.from("orders").select("id").eq("number", n).maybeSingle();
      if (exists) throw new Error(`Le reçu ${orderNo(n)} est déjà enregistré`);
      let clientId: string | null = null;
      if (phone.trim()) {
        const { data: c } = await supabase.from("clients").select("id").eq("phone", phone.trim()).limit(1).maybeSingle();
        clientId = c?.id ?? null;
      }
      if (!clientId) {
        const { data: c, error } = await supabase.from("clients").insert({ name: name.trim(), phone: phone.trim() || null }).select("id").single();
        if (error) throw error;
        clientId = c.id;
      }
      const allReady = items.every((l) => l.ready);
      const { data: order, error } = await supabase.from("orders").insert({
        legacy: true, number: n, client_id: clientId, pickup_date: pickup, created_at: new Date(deposit + "T09:00:00").toISOString(),
        status: allReady ? "pret" : "en_cours", ready_at: allReady ? new Date().toISOString() : null,
      }).select("id").single();
      if (error) throw error;
      const { error: ie } = await supabase.from("order_items").insert(items.map((l) => ({
        order_id: order.id, designation: l.designation.trim(), quantity: l.quantity, unit_price: l.unit_price, ready: l.ready,
      })));
      if (ie) throw ie;
      if (paid > 0) {
        const { error: pe } = await supabase.from("payments").insert({ order_id: order.id, amount: paid, method: "especes", context: "ancien", created_at: new Date(deposit + "T09:00:00").toISOString() });
        if (pe) throw pe;
      }
      toast.success(`Ancien reçu ${orderNo(n)} enregistré`);
      navigate({ to: "/commandes/$id", params: { id: order.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Ancien reçu papier" subtitle="Enregistrez une commande faite avant le logiciel, avec son numéro de reçu papier. Les nouveaux reçus continueront après le plus grand numéro." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Reçu et client</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>N° du reçu papier *</Label><Input placeholder="000120" value={num} onChange={(e) => setNum(e.target.value)} /></div>
              <div className="space-y-1"><Label>Nom du client *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1"><Label>Téléphone (si disponible)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-1"><Label>Date de dépôt</Label><Input type="date" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
              <div className="space-y-1"><Label>Date prévue de retrait</Label><Input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Vêtements déposés</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lines.map((l) => (
                <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <Input className="min-w-40 flex-1" placeholder="Ex : Chemise" value={l.designation} onChange={(e) => upd(l.key, { designation: e.target.value })} />
                  <Input type="number" min={1} className="w-20" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Math.max(1, +e.target.value) })} />
                  <span className="text-sm">×</span>
                  <Input type="number" min={0} className="w-28" value={l.unit_price} onChange={(e) => upd(l.key, { unit_price: Math.max(0, +e.target.value) })} />
                  <button type="button" onClick={() => upd(l.key, { ready: !l.ready })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", l.ready ? "border-success bg-success/15 text-success" : "border-warning bg-warning/20")}>{l.ready ? "✓ Prêt" : "En cours"}</button>
                  <Button variant="ghost" size="icon" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setLines((ls) => [...ls, { key: Date.now(), designation: "", quantity: 1, unit_price: 0, ready: false }])}>+ Ajouter un vêtement</Button>
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader><CardTitle>Montants</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">Total</span><span className="font-display text-3xl font-bold">{fcfa(total)}</span></div>
            <div className="space-y-1"><Label>Montant déjà payé</Label><Input type="number" min={0} value={paid} onChange={(e) => setPaid(+e.target.value)} /></div>
            <p className="text-sm">Reste à payer : <b>{fcfa(Math.max(0, total - paid))}</b></p>
            <p className="text-xs text-muted-foreground">Le montant déjà payé sur le reçu papier n'est pas recompté dans les recettes.</p>
            <Button size="lg" className="w-full" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer l'ancien reçu"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
