import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, AdminOnly } from "@/components/hysope/ui";
import { dateTimeFr } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Audit /></AdminOnly>; },
});

const TABLES = ["", "auth", "orders", "order_items", "payments", "services", "order_requests", "expenses", "cash_closings", "cash_movements", "clients", "profiles"];

function Audit() {
  const [t, setT] = useState("");
  const { data } = useQuery({
    queryKey: ["audit", t],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
      if (t) q = q.eq("table_name", t);
      const [{ data: rows }, { data: profs }] = await Promise.all([q, supabase.from("profiles").select("id,full_name")]);
      const names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return (rows ?? []).map((r) => ({ ...r, who: names.get(r.user_id ?? "") ?? "Système" }));
    },
  });
  return (
    <div>
      <PageHeader title="Historique des actions" subtitle="Ancienne valeur, nouvelle valeur, utilisateur, date et heure." />
      <select className="mb-4 h-10 rounded-md border bg-background px-2" value={t} onChange={(e) => setT(e.target.value)}>
        {TABLES.map((x) => <option key={x} value={x}>{x || "Tout"}</option>)}
      </select>
      <div className="space-y-1 text-sm">
        {data?.map((r) => (
          <details key={r.id} className="rounded border bg-card p-2">
            <summary className="cursor-pointer">{dateTimeFr(r.at)} · <b>{r.who}</b> · {r.table_name} · {r.action}</summary>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(r.old_data, null, 1)}</pre>
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(r.new_data, null, 1)}</pre>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
