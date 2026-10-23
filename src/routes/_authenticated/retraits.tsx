import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METHOD_LABEL, fcfa, orderNo, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/retraits")({
  head: () => ({ meta: [{ title: "Journal des retraits — Hysope Manager" }] }),
  component: Journal,
});

function Journal() {
  const [day, setDay] = useState(todayISO());
  const { data } = useQuery({
    queryKey: ["withdrawals", day],
    queryFn: async () => {
      const start = new Date(day + "T00:00:00"), end = new Date(start.getTime() + 864e5);
      const { data: orders } = await supabase.from("order_summary").select("*").in("status", ["retire", "livre"])
        .or(`and(withdrawn_at.gte.${start.toISOString()},withdrawn_at.lt.${end.toISOString()}),and(delivered_at.gte.${start.toISOString()},delivered_at.lt.${end.toISOString()})`);
      const ids = (orders ?? []).map((o) => o.id!);
      const [{ data: pays }, { data: profs }] = await Promise.all([
        supabase.from("payments").select("*").in("order_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("profiles").select("id,full_name"),
      ]);
      const names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return (orders ?? []).map((o) => {
        const p = (pays ?? []).filter((x) => x.order_id === o.id);
        const dep = p.filter((x) => x.context === "depot").reduce((s, x) => s + x.amount, 0);
        const last = p.filter((x) => x.context !== "depot");
        return { o, advance: dep, soldePaid: last.reduce((s, x) => s + x.amount, 0), methods: [...new Set(last.map((x) => METHOD_LABEL[x.method]))].join(", "), user: names.get(o.withdrawn_by ?? "") ?? "" };
      });
    },
  });
  return (
    <div>
      <PageHeader title="Journal des retraits" subtitle="Généré automatiquement chaque jour." actions={<Button variant="outline" onClick={() => window.print()}>Imprimer</Button>} />
      <Input type="date" className="no-print mb-4 w-48" value={day} onChange={(e) => setDay(e.target.value)} />
      <div className="print-area">
        {!data?.length ? <Empty>Aucun retrait ce jour.</Empty> : (
          <table className="w-full rounded-xl border bg-card text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">N°</th><th>Client</th><th className="text-right">Total</th><th className="text-right">Avance</th><th className="text-right">Solde payé</th><th>Moyen</th><th>Heure</th><th>Par</th></tr></thead>
            <tbody>
              {data.map(({ o, advance, soldePaid, methods, user }) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3"><Link to="/commandes/$id" params={{ id: o.id! }} className="font-semibold text-primary">{orderNo(o.number)}</Link></td>
                  <td>{o.client_name}</td><td className="text-right">{fcfa(o.final_total)}</td><td className="text-right">{fcfa(advance)}</td><td className="text-right">{fcfa(soldePaid)}</td>
                  <td>{methods || "—"}</td><td>{new Date(o.withdrawn_at ?? o.delivered_at!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td><td>{o.status === "livre" ? `Livré (${o.deliverer ?? ""})` : user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
