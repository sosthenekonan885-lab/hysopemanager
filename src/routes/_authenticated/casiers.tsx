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

function Lockers() {
  const { data } = useQuery({
    queryKey: ["lockers"],
    queryFn: async () => (await supabase.from("order_summary").select("id,number,client_name,locker_code,bag_code,status").in("status", ["pret", "a_livrer"])).data ?? [],
  });
  const byLocker = new Map((data ?? []).filter((o) => o.locker_code).map((o) => [o.locker_code!, o]));
  const bags = (data ?? []).filter((o) => o.bag_code);
  return (
    <div>
      <PageHeader title="Casiers & sacs" subtitle={`${byLocker.size} / 32 casiers occupés`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {LOCKERS.map((l) => {
          const o = byLocker.get(l);
          const inner = (
            <div className={cn("h-full rounded-xl border p-3", o ? "border-primary bg-primary/10" : "border-dashed bg-card")}>
              <div className="font-mono text-lg font-bold">{l}</div>
              {o ? <><div className="text-xs font-semibold text-primary">{orderNo(o.number)}</div><div className="truncate text-xs">{o.client_name}</div></> : <div className="text-xs text-success">Libre</div>}
            </div>
          );
          return o ? <Link key={l} to="/commandes/$id" params={{ id: o.id! }}>{inner}</Link> : <div key={l}>{inner}</div>;
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
