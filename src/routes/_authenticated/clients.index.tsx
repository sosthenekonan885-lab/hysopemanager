import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Pill, Empty } from "@/components/hysope/ui";
import { Input } from "@/components/ui/input";
import { dateFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: [{ title: "Clients — Hysope Manager" }, { name: "description", content: "Clients du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:title", content: "Clients — Hysope Manager" }, { property: "og:description", content: "Clients du Pressing L’Hysope : gestion et suivi dans Hysope Manager." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Clients,
});

function Clients() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["clients", q],
    queryFn: async () => {
      let qb = supabase.from("clients").select("*").order("name").limit(200);
      if (q.trim()) qb = qb.or(`name.ilike.%${q}%,phone.ilike.%${q}%,quartier.ilike.%${q}%`);
      return (await qb).data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Fichier clients" subtitle="Les nouveaux clients se créent lors d'un dépôt." />
      <Input className="mb-4 max-w-sm" placeholder="Nom, téléphone, quartier…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!data?.length ? <Empty>Aucun client.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="rounded-xl border bg-card p-4 transition hover:shadow-soft">
              <div className="flex items-start justify-between"><div className="font-semibold">{c.name}</div>{c.delivery_eligible && <Pill tone="info">Livraison</Pill>}</div>
              <div className="text-sm text-muted-foreground">{c.phone} {c.quartier && `· ${c.quartier}`}</div>
              <div className="mt-1 text-xs text-muted-foreground">Client depuis le {dateFr(c.created_at)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
