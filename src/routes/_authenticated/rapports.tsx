import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Stat, AdminOnly } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { fcfa, todayISO } from "@/lib/format";
import { periodStats } from "@/lib/cash";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Reports /></AdminOnly>; },
});

const PERIODS = { jour: "Journalier", semaine: "Hebdomadaire", mois: "Mensuel", annee: "Fin d'année" } as const;

function range(p: keyof typeof PERIODS) {
  const t = todayISO(); const d = new Date(t + "T12:00:00");
  if (p === "jour") return [t, t];
  if (p === "semaine") { const s = new Date(d); s.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [s.toISOString().slice(0, 10), t]; }
  if (p === "mois") return [t.slice(0, 8) + "01", t];
  return [t.slice(0, 4) + "-01-01", t];
}

function Reports() {
  const [p, setP] = useState<keyof typeof PERIODS>("mois");
  const [from, to] = range(p);
  const { data: s } = useQuery({ queryKey: ["report", from, to], queryFn: () => periodStats(from, to) });
  const byDay = new Map<string, number>();
  s?.payments.forEach((x) => { const k = x.created_at.slice(0, p === "annee" ? 7 : 10); byDay.set(k, (byDay.get(k) ?? 0) + x.amount); });
  const chart = [...byDay.entries()].sort().map(([k, v]) => ({ k: k.slice(5), v }));
  const gaps = s?.closings.reduce((a, c) => a + c.gap, 0) ?? 0;
  return (
    <div className="print-area">
      <PageHeader title={`Rapport ${PERIODS[p].toLowerCase()}`} subtitle={`Du ${new Date(from).toLocaleDateString("fr-FR")} au ${new Date(to).toLocaleDateString("fr-FR")}`}
        actions={<>{(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => <Button key={k} variant={k === p ? "default" : "outline"} size="sm" onClick={() => setP(k)}>{PERIODS[k]}</Button>)}<Button size="sm" variant="secondary" onClick={() => window.print()}>Imprimer</Button></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires encaissé" value={fcfa(s?.revenue)} accent />
        <Stat label="Commandes" value={s?.orders ?? 0} hint={fcfa(s?.ordersValue)} />
        <Stat label="Avances" value={fcfa(s?.avances)} />
        <Stat label="Restant à payer" value={fcfa(s?.remaining)} />
        <Stat label="Espèces" value={fcfa(s?.especes)} />
        <Stat label="Wave" value={fcfa(s?.wave)} />
        <Stat label="Orange Money" value={fcfa(s?.om)} />
        <Stat label="Dépenses" value={fcfa(s?.expenses)} />
        <Stat label="Écarts de caisse" value={fcfa(gaps)} />
        <Stat label="Solde financier" value={fcfa((s?.revenue ?? 0) - (s?.expenses ?? 0))} accent />
      </div>
      <div className="h-72 rounded-xl border bg-card p-4">
        <ResponsiveContainer>
          <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="k" /><YAxis /><Tooltip formatter={(v: number) => fcfa(v)} /><Bar dataKey="v" fill="var(--chart-1)" radius={4} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
