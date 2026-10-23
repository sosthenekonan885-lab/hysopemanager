import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, Empty } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { fcfa, orderNo, dateTimeFr } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/livraisons")({
  head: () => ({ meta: [{ title: "Livraisons — Hysope Manager" }] }),
  component: Deliveries,
});

function Deliveries() {
  const { data: me } = useMe();
  const { data, refetch } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const [todo, done, cash] = await Promise.all([
        supabase.from("order_summary").select("*").eq("status", "a_livrer").order("pickup_date"),
        supabase.from("order_summary").select("*").eq("status", "livre").order("delivered_at", { ascending: false }).limit(30),
        supabase.from("payments").select("*, orders(number)").eq("context", "livraison").eq("method", "especes").is("cash_confirmed_at", null),
      ]);
      return { todo: todo.data ?? [], done: done.data ?? [], cash: cash.data ?? [] };
    },
  });
  return (
    <div>
      <PageHeader title="Livraisons" subtitle="Livraison gratuite pour les clients éligibles." />
      {!!data?.cash.length && (
        <div className="mb-6 rounded-xl border border-warning bg-warning/15 p-4">
          <h3 className="mb-2 font-semibold">Espèces à récupérer auprès des livreurs</h3>
          {data.cash.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1 text-sm">
              <span>{orderNo(p.orders?.number)} · {p.deliverer} · {fcfa(p.amount)}</span>
              <Button size="sm" onClick={async () => { const { error } = await supabase.from("payments").update({ cash_confirmed_by: me?.id, cash_confirmed_at: new Date().toISOString() }).eq("id", p.id); if (error) toast.error(error.message); else { toast.success("Espèces remises"); refetch(); } }}>Espèces remises</Button>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-3 text-xl font-bold">À livrer</h2>
      {!data?.todo.length ? <Empty>Aucune livraison en attente.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.todo.map((o) => (
            <Link key={o.id} to="/commandes/$id" params={{ id: o.id! }} className="rounded-xl border bg-card p-4 hover:shadow-soft">
              <div className="flex justify-between"><b>{orderNo(o.number)}</b><Pill tone="info">{o.deliverer ?? "Livreur à affecter"}</Pill></div>
              <div>{o.client_name} · {o.client_phone}</div>
              <div className="text-sm text-muted-foreground">{o.client_address} · {o.client_quartier}</div>
              <div className="mt-1 text-sm">Reste à payer : <b>{fcfa(o.balance)}</b></div>
            </Link>
          ))}
        </div>
      )}
      <h2 className="mb-3 mt-8 text-xl font-bold">Livrées récemment</h2>
      <div className="space-y-2">
        {data?.done.map((o) => (
          <div key={o.id} className="flex justify-between rounded-lg border bg-card p-3 text-sm">
            <span>{orderNo(o.number)} · {o.client_name} · {o.deliverer}</span>
            <span>{dateTimeFr(o.delivered_at)} · {o.balance ? <Pill tone="warning">Livré – paiement restant</Pill> : <Pill tone="success">Livré et payé</Pill>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
