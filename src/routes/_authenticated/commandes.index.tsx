import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusBadge, Empty } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, dateFr, fcfa, orderNo, type OrderStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/commandes/")({
  validateSearch: z.object({ q: z.string().optional(), status: z.string().optional() }),
  head: () => ({ meta: [{ title: "Commandes — Hysope Manager" }] }),
  component: Orders,
});

function Orders() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const status = search.status ?? "actives";

  const { data, isLoading } = useQuery({
    queryKey: ["orders", search.q, status],
    queryFn: async () => {
      let qb = supabase.from("order_summary").select("*").order("number", { ascending: false }).limit(200);
      const term = (search.q ?? "").trim();
      if (term) {
        const n = Number(term.replace(/\D/g, ""));
        const ors = [`client_name.ilike.%${term}%`, `client_phone.ilike.%${term}%`];
        if (n && /^[\sN°#0-9]+$/i.test(term)) ors.push(`number.eq.${n}`);
        qb = qb.or(ors.join(","));
      }
      if (status === "actives") qb = qb.in("status", ["en_cours", "pret", "a_livrer"]);
      else if (status !== "toutes") qb = qb.eq("status", status as OrderStatus);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader title="Commandes" subtitle="Recherchez par nom, téléphone ou numéro." actions={<><Button asChild variant="outline"><Link to="/commandes/ancienne">+ Ancien reçu papier</Link></Button><Button asChild><Link to="/commandes/nouvelle">+ Nouveau dépôt</Link></Button></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); navigate({ search: { ...search, q } }); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="max-w-sm" />
          <Button variant="secondary">Rechercher</Button>
        </form>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => navigate({ search: { ...search, status: e.target.value } })}>
          <option value="actives">Commandes actives</option>
          <option value="toutes">Toutes</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : !data?.length ? <Empty>Aucune commande.</Empty> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">N°</th><th>Client</th><th>Statut</th><th>Emplacement</th><th>Retrait prévu</th><th className="text-right">Total</th><th className="p-3 text-right">Reste</th></tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/40">
                  <td className="p-3 font-semibold"><Link to="/commandes/$id" params={{ id: o.id! }} className="text-primary hover:underline">{orderNo(o.number)}</Link></td>
                  <td><div className="font-medium">{o.client_name}</div><div className="text-xs text-muted-foreground">{o.client_phone}</div></td>
                  <td><StatusBadge status={o.status!} /></td>
                  <td className="font-mono">{o.locker_code ?? o.bag_code ?? "—"}</td>
                  <td>{dateFr(o.pickup_date)}</td>
                  <td className="text-right">{fcfa(o.final_total)}</td>
                  <td className="p-3 text-right font-semibold">{o.balance ? fcfa(o.balance) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
