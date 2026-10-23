import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, AdminOnly, Empty } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { dateTimeFr } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Notifs /></AdminOnly>; },
});

function Notifs() {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["notifs"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const upd = async (id: string, patch: { read?: boolean; treated?: boolean }) => {
    await supabase.from("notifications").update(patch).eq("id", id); refetch(); qc.invalidateQueries({ queryKey: ["notif-count"] });
  };
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Conservées dans l'historique même après lecture." />
      {!data?.length ? <Empty>Aucune notification.</Empty> : (
        <div className="space-y-2">
          {data.map((n) => (
            <div key={n.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 ${n.read ? "opacity-70" : "border-primary"}`}>
              <div>
                <div className="font-semibold">{n.title} {n.treated && <Pill tone="success">Traitée</Pill>}</div>
                <div className="text-sm">{n.body}</div>
                <div className="text-xs text-muted-foreground">{dateTimeFr(n.created_at)}</div>
              </div>
              <div className="flex gap-2">
                {n.order_id && <Button asChild size="sm" variant="outline"><Link to="/commandes/$id" params={{ id: n.order_id }} onClick={() => upd(n.id, { read: true })}>Ouvrir</Link></Button>}
                {!n.read && <Button size="sm" variant="ghost" onClick={() => upd(n.id, { read: true })}>Marquer lue</Button>}
                {!n.treated && <Button size="sm" onClick={() => upd(n.id, { treated: true, read: true })}>Traitée</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
