import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, StatusBadge } from "@/components/hysope/ui";
import { fcfa, orderNo, todayISO, dateFr } from "@/lib/format";
import { periodStats } from "@/lib/cash";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord — Hysope Manager" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const day = todayISO();
  const { data: s } = useQuery({ queryKey: ["cash", day], queryFn: () => periodStats(day, day) });
  const { data: o } = useQuery({
    queryKey: ["dash-orders"],
    queryFn: async () => {
      const [due, counts] = await Promise.all([
        supabase.from("order_summary").select("*").in("status", ["en_cours", "pret", "a_livrer"]).lte("pickup_date", day).order("pickup_date").limit(10),
        supabase.from("orders").select("status").in("status", ["en_cours", "pret", "a_livrer"]),
      ]);
      const c = { en_cours: 0, pret: 0, a_livrer: 0 } as Record<string, number>;
      (counts.data ?? []).forEach((x) => (c[x.status] += 1));
      return { due: due.data ?? [], c };
    },
  });
  return (
    <div>
      <PageHeader title={`Bonjour ${me?.profile?.full_name?.split(" ")[0] ?? ""}`} subtitle={`Aujourd'hui, ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Encaissé aujourd'hui" value={fcfa(s?.revenue)} accent hint={`Espèces ${fcfa(s?.especes)} · Wave ${fcfa(s?.wave)} · OM ${fcfa(s?.om)}`} />
        <Stat label="Dépôts du jour" value={s?.orders ?? 0} hint={fcfa(s?.ordersValue)} />
        <Stat label="En traitement" value={o?.c.en_cours ?? 0} />
        <Stat label="Prêts / à livrer" value={`${o?.c.pret ?? 0} / ${o?.c.a_livrer ?? 0}`} />
      </div>
      <h2 className="mb-3 text-xl font-bold">Retraits prévus jusqu'à aujourd'hui</h2>
      <div className="space-y-2">
        {o?.due.length === 0 && <p className="text-muted-foreground">Rien en attente.</p>}
        {o?.due.map((x) => (
          <Link key={x.id} to="/commandes/$id" params={{ id: x.id! }} className="flex items-center justify-between rounded-lg border bg-card p-3 hover:shadow-soft">
            <span><b>{orderNo(x.number)}</b> · {x.client_name} · prévu le {dateFr(x.pickup_date)}</span>
            <span className="flex items-center gap-3"><StatusBadge status={x.status!} />{x.balance ? fcfa(x.balance) : ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
