import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, Empty } from "@/components/hysope/ui";
import { Input } from "@/components/ui/input";
import { dateFr, orderNo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reclamations")({
  head: () => ({ meta: [{ title: "Réclamations — Hysope Manager" }] }),
  component: Complaints,
});

const LABEL = { en_cours: "En cours", resolue: "Résolue", refusee: "Refusée" } as const;

function Complaints() {
  const { data, refetch } = useQuery({
    queryKey: ["complaints"],
    queryFn: async () => (await supabase.from("complaints").select("*, orders(id, number, clients(name))").order("created_at", { ascending: false })).data ?? [],
  });
  const update = async (id: string, patch: { status?: string; solution?: string; final_comment?: string }) => {
    const { error } = await supabase.from("complaints").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refetch();
  };
  return (
    <div>
      <PageHeader title="Réclamations" subtitle="Ajoutez une réclamation depuis la page d'une commande." />
      {!data?.length ? <Empty>Aucune réclamation.</Empty> : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to="/commandes/$id" params={{ id: c.orders!.id }} className="font-semibold text-primary">{orderNo(c.orders?.number)}</Link> · {c.orders?.clients?.name} · {dateFr(c.created_at)}
                  <div><b>{c.type}</b> {c.item && `— ${c.item}`}: {c.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={c.status === "resolue" ? "success" : c.status === "refusee" ? "destructive" : "warning"}>{LABEL[c.status as keyof typeof LABEL]}</Pill>
                  <select className="h-8 rounded-md border bg-background px-2 text-sm" value={c.status} onChange={(e) => update(c.id, { status: e.target.value })}>
                    {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input placeholder="Solution proposée" defaultValue={c.solution ?? ""} onBlur={(e) => e.target.value !== (c.solution ?? "") && update(c.id, { solution: e.target.value })} />
                <Input placeholder="Commentaire final" defaultValue={c.final_comment ?? ""} onBlur={(e) => e.target.value !== (c.final_comment ?? "") && update(c.id, { final_comment: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
