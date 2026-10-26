import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { trackOrder } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/hysope/Logo";
import { STATUS_LABEL, dateFr, fcfa, orderNo, type OrderStatus } from "@/lib/format";

export const Route = createFileRoute("/suivi")({
  head: () => ({
    meta: [
      { title: "Suivre ma commande — Pressing L'Hysope" },
      { name: "description", content: "Consultez l'état de votre commande au Pressing L'Hysope avec votre numéro de reçu." },
      { property: "og:title", content: "Suivre ma commande — Pressing L'Hysope" },
      { property: "og:description", content: "Statut, date de retrait et solde de votre commande." },
    ],
  }),
  component: Suivi,
});

type Res = Awaited<ReturnType<typeof trackOrder>>;

function Suivi() {
  const [num, setNum] = useState("");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 border-b bg-card px-6 py-4"><Link to="/"><Logo /></Link><Button asChild variant="outline"><Link to="/">Retour à la page de connexion</Link></Button></header>
      <main className="mx-auto max-w-lg space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Suivre ma commande</h1>
          <p className="text-muted-foreground">Indiquez le numéro inscrit sur votre reçu et votre téléphone.</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault(); setBusy(true);
            try { setRes(await trackOrder({ data: { number: Number(num.replace(/\D/g, "")), phone } })); } finally { setBusy(false); }
          }}
        >
          <div className="space-y-2"><Label>Numéro de commande</Label><Input required placeholder="000047" value={num} onChange={(e) => setNum(e.target.value)} /></div>
          <div className="space-y-2"><Label>Téléphone</Label><Input required placeholder="07 08 52 11 44" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>{busy ? "Recherche…" : "Voir ma commande"}</Button>
        </form>
        {res && !res.found && <p className="rounded-lg bg-muted p-4 text-sm">Aucune commande trouvée avec ces informations.</p>}
        {res && res.found && (
          <Card className="shadow-soft">
            <CardContent className="space-y-2 p-6">
              <div className="text-sm text-muted-foreground">Commande {orderNo(res.order.number)}</div>
              <div className="text-2xl font-bold text-primary">{STATUS_LABEL[res.order.status as OrderStatus]}</div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <span>Déposée le</span><span className="text-right">{dateFr(res.order.created_at)}</span>
                <span>Retrait prévu</span><span className="text-right">{dateFr(res.order.pickup_date)}</span>
                <span>Total</span><span className="text-right">{fcfa(res.order.final_total)}</span>
                <span>Déjà payé</span><span className="text-right">{fcfa(res.order.paid)}</span>
                <span className="font-semibold">Reste à payer</span><span className="text-right font-semibold">{fcfa(res.order.balance)}</span>
              </div>
            </CardContent>
          </Card>
        )}
        <p className="text-center text-sm text-muted-foreground">Pressing L'Hysope · Yopougon Ananeraie · 07 08 52 11 44</p>
      </main>
    </div>
  );
}
