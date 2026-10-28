import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Stat, AdminOnly } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fcfa, todayISO } from "@/lib/format";
import { periodStats } from "@/lib/cash";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Reports /></AdminOnly>; },
});

const PERIODS = { jour: "Journalier", semaine: "Hebdomadaire", mois: "Mensuel", annee: "Fin d'année", perso: "Personnalisé" } as const;
type P = keyof typeof PERIODS;

function range(p: Exclude<P, "perso">): [string, string] {
  const t = todayISO(); const d = new Date(t + "T12:00:00");
  if (p === "jour") return [t, t];
  if (p === "semaine") { const s = new Date(d); s.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [s.toISOString().slice(0, 10), t]; }
  if (p === "mois") return [t.slice(0, 8) + "01", t];
  return [t.slice(0, 4) + "-01-01", t];
}

function Reports() {
  const [p, setP] = useState<P>("mois");
  const [custom, setCustom] = useState<[string, string]>(range("mois"));
  const [from, to] = p === "perso" ? custom : range(p);
  const { data: s } = useQuery({ queryKey: ["report", from, to], queryFn: () => periodStats(from, to) });
  const long = (new Date(to).getTime() - new Date(from).getTime()) / 864e5 > 62;
  const key = (iso: string) => iso.slice(0, long ? 7 : 10);
  const rows = new Map<string, { k: string; depots: number; retraits: number; commandes: number }>();
  const row = (k: string) => { if (!rows.has(k)) rows.set(k, { k, depots: 0, retraits: 0, commandes: 0 }); return rows.get(k)!; };
  s?.payments.filter((x) => x.context === "depot").forEach((x) => (row(key(x.created_at)).depots += x.amount));
  s?.withdrawals.forEach((w) => (row(key(w.date)).retraits += w.amount));
  s?.ordersList.forEach((o) => o.created_at && (row(key(o.created_at)).commandes += 1));
  const chart = [...rows.values()].sort((a, b) => a.k.localeCompare(b.k)).map((r) => ({ ...r, k: long ? r.k : r.k.slice(5), total: r.depots + r.retraits }));
  const gaps = s?.closings.reduce((a, c) => a + c.gap, 0) ?? 0;
  return (
    <div className="print-area">
      <PageHeader title={`Rapport ${PERIODS[p].toLowerCase()}`} subtitle={`Du ${new Date(from).toLocaleDateString("fr-FR")} au ${new Date(to).toLocaleDateString("fr-FR")}`}
        actions={<>{(Object.keys(PERIODS) as P[]).map((k) => <Button key={k} variant={k === p ? "default" : "outline"} size="sm" onClick={() => setP(k)}>{PERIODS[k]}</Button>)}<Button size="sm" variant="secondary" onClick={() => window.print()}>Imprimer</Button></>} />
      {p === "perso" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          Du <Input type="date" className="w-44" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
          au <Input type="date" className="w-44" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} />
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires encaissé" value={fcfa(s?.revenue)} accent />
        <Stat label="Commandes déposées" value={s?.orders ?? 0} hint={fcfa(s?.ordersValue)} />
        <Stat label="Retraits" value={s?.withdrawalsCount ?? 0} hint={fcfa(s?.withdrawalsAmount)} />
        <Stat label="Prêtes / en cours (maintenant)" value={`${s?.readyNow ?? 0} / ${s?.inProgressNow ?? 0}`} />
        <Stat label="Avances" value={fcfa(s?.avances)} />
        <Stat label="Restant à payer" value={fcfa(s?.remaining)} />
        <Stat label="Espèces" value={fcfa(s?.especes)} />
        <Stat label="Wave" value={fcfa(s?.wave)} />
        <Stat label="Orange Money" value={fcfa(s?.om)} />
        <Stat label="Dépenses" value={fcfa(s?.expenses)} />
        <Stat label="Écarts de caisse" value={fcfa(gaps)} />
        <Stat label="Solde financier" value={fcfa((s?.revenue ?? 0) - (s?.expenses ?? 0))} accent />
      </div>
      <h2 className="mb-2 text-lg font-bold">Évolution des encaissements</h2>
      <div className="mb-6 h-72 rounded-xl border bg-card p-4">
        <ResponsiveContainer>
          <LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="k" /><YAxis /><Tooltip formatter={(v: number) => fcfa(v)} /><Legend />
            <Line type="monotone" dataKey="total" name="Total" stroke="var(--chart-1)" strokeWidth={2} />
            <Line type="monotone" dataKey="depots" name="Avances dépôt" stroke="var(--chart-2)" />
            <Line type="monotone" dataKey="retraits" name="Retraits" stroke="var(--chart-3)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <h2 className="mb-2 text-lg font-bold">Nombre de commandes</h2>
      <div className="h-64 rounded-xl border bg-card p-4">
        <ResponsiveContainer>
          <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="k" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="commandes" name="Commandes" fill="var(--chart-1)" radius={4} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
