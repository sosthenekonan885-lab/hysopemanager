import { clientName as uppercaseName } from "@/lib/article-language";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, AdminOnly } from "@/components/hysope/ui";
import { fcfa, todayISO } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/classement")({
  head: () => ({ meta: [{ title: "Classement clients — Hysope Manager" }, { name: "description", content: "Classement mensuel des clients du Pressing L’Hysope selon les sommes réellement encaissées." }, { property: "og:title", content: "Classement clients — Hysope Manager" }, { property: "og:description", content: "Clients les plus fidèles du mois, basés sur les paiements encaissés." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Ranking /></AdminOnly>; },
});

type Row = { rank: number; client_id: string; name: string; phone: string | null; orders_count: number; total_spent: number };
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MEDALS = ["bg-accent/30 border-accent", "bg-muted border-muted-foreground/40", "bg-secondary border-primary/30"];

function Ranking() {
  const t = todayISO();
  const [year, setYear] = useState(Number(t.slice(0, 4)));
  const [month, setMonth] = useState(Number(t.slice(5, 7)));
  const years = Array.from({ length: 6 }, (_, i) => Number(t.slice(0, 4)) - i);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ranking", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("monthly_client_ranking", { p_year: year, p_month: month });
      if (error) throw error;
      return data as unknown as { rows: Row[]; unassigned: number };
    },
  });
  const rows = data?.rows ?? [];
  const sel = "h-10 rounded-md border bg-background px-2";
  return (
    <div>
      <PageHeader title="Classement des clients" subtitle={`${MONTHS[month - 1]} ${year} · sommes réellement encaissées`}
        actions={<>
          <select aria-label="Mois" className={sel} value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <select aria-label="Année" className={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </>} />
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : rows.length === 0 ? <p className="text-muted-foreground">Aucun paiement encaissé ce mois-ci.</p> : <>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {rows.slice(0, 3).map((r, i) => (
            <div key={r.client_id} className={`rounded-xl border-2 p-4 ${MEDALS[i]}`}>
              <div className="flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-primary" />{r.rank}{r.rank === 1 ? "er" : "e"}</div>
              <div className="mt-1 text-lg font-bold">{uppercaseName(r.name)}</div>
              <div className="text-sm text-muted-foreground">{r.phone ?? "—"} · {r.orders_count} commande(s)</div>
              <div className="mt-2 text-2xl font-bold text-primary">{fcfa(r.total_spent)}</div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="p-3">Rang</th><th className="p-3">Client</th><th className="p-3">Téléphone</th><th className="p-3 text-right">Commandes</th><th className="p-3 text-right">Montant encaissé</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.client_id} className={`border-t ${r.rank <= 3 ? "bg-accent/10 font-semibold" : ""}`}>
                <td className="p-3">{r.rank}</td><td className="p-3">{uppercaseName(r.name)}</td><td className="p-3">{r.phone ?? "—"}</td>
                <td className="p-3 text-right">{r.orders_count}</td><td className="p-3 text-right">{fcfa(r.total_spent)}</td>
              </tr>))}</tbody>
          </table>
        </div>
        {(data?.unassigned ?? 0) > 0 && <p className="mt-3 text-sm text-muted-foreground">{fcfa(data?.unassigned)} de retraits manuels n’ont pas pu être rattachés à un client précis.</p>}
      </>}
    </div>
  );
}
