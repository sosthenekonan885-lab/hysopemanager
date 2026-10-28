import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty } from "@/components/hysope/ui";
import { LOCKERS, orderNo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/casiers")({
  head: () => ({ meta: [{ title: "Casiers & sacs — Hysope Manager" }] }),
  component: Lockers,
});

const MAX_LOTS = 12;
const PER_LOT = 7;

function Lockers() {
  const { data } = useQuery({
    queryKey: ["lockers"],
    queryFn: async () => {
      const orders = (await supabase.from("order_summary").select("id,number,client_name,locker_code,bag_code,status").in("status", ["pret", "a_livrer"])).data ?? [];
      const ids = orders.map((o) => o.id!).filter(Boolean);
      const items = ids.length ? (await supabase.from("order_items").select("order_id,quantity").in("order_id", ids)).data ?? [] : [];
      const qty = new Map<string, number>();
      items.forEach((i) => qty.set(i.order_id, (qty.get(i.order_id) ?? 0) + i.quantity));
      return orders.map((o) => ({ ...o, qty: qty.get(o.id!) ?? 0 }));
    },
  });
  const byLocker = new Map<string, NonNullable<typeof data>>();
  (data ?? []).filter((o) => o.locker_code).forEach((o) => byLocker.set(o.locker_code!, [...(byLocker.get(o.locker_code!) ?? []), o]));
  const bags = (data ?? []).filter((o) => o.bag_code);
  return (
    <div>
      <PageHeader title="Casiers & sacs" subtitle={`${byLocker.size} / 32 casiers utilisés · 12 lots de 7 vêtements par casier`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {LOCKERS.map((l) => {
          const list = byLocker.get(l) ?? [];
          const lots = list.reduce((s, o) => s + Math.max(1, Math.ceil(o.qty / PER_LOT)), 0);
          const full = lots >= MAX_LOTS;
          return (
            <div key={l} className={cn("rounded-xl border p-3", full ? "border-destructive bg-destructive/10" : list.length ? "border-primary bg-primary/10" : "border-dashed bg-card")}>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-lg font-bold">{l}</span>
                <span className={cn("text-xs font-semibold", full ? "text-destructive" : list.length ? "text-primary" : "text-success")}>{full ? "Plein" : list.length ? `${lots}/${MAX_LOTS} lots` : "Libre"}</span>
              </div>
              <div className="my-2 grid grid-cols-12 gap-0.5">
                {Array.from({ length: MAX_LOTS }, (_, i) => <div key={i} className={cn("h-2 rounded-sm", i < lots ? (full ? "bg-destructive" : "bg-primary") : "bg-muted")} />)}
              </div>
              {list.map((o) => (
                <Link key={o.id} to="/commandes/$id" params={{ id: o.id! }} className="block truncate text-xs hover:underline">
                  <b>{orderNo(o.number)}</b> · {o.client_name} ({o.qty})
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Zone sacs</h2>
      {!bags.length ? <Empty>Aucun sac en stock.</Empty> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {bags.map((o) => (
            <Link key={o.id} to="/commandes/$id" params={{ id: o.id! }} className="rounded-xl border border-accent bg-accent/20 p-3">
              <div className="font-mono text-lg font-bold">{o.bag_code}</div>
              <div className="text-xs font-semibold">{orderNo(o.number)}</div><div className="truncate text-xs">{o.client_name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
