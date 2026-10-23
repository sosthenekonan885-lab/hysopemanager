import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, AdminOnly } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { METHOD_LABEL, dateFr, fcfa, todayISO, type PayMethod } from "@/lib/format";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Expenses /></AdminOnly>; },
});

function Expenses() {
  const [f, setF] = useState({ date: todayISO(), category_id: "", amount: 0, description: "", method: "especes" as PayMethod });
  const [cat, setCat] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const [e, c] = await Promise.all([
        supabase.from("expenses").select("*, expense_categories(name)").order("date", { ascending: false }).limit(100),
        supabase.from("expense_categories").select("*").order("name"),
      ]);
      return { list: e.data ?? [], cats: c.data ?? [] };
    },
  });
  return (
    <div>
      <PageHeader title="Dépenses" />
      <form className="mb-6 grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-6" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("expenses").insert({ ...f, category_id: f.category_id || null });
        if (error) toast.error(error.message); else { toast.success("Dépense enregistrée"); setF({ ...f, amount: 0, description: "" }); refetch(); }
      }}>
        <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <select className="h-10 rounded-md border bg-background px-2" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} required>
          <option value="">Catégorie</option>{data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input type="number" placeholder="Montant" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: +e.target.value })} required />
        <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <select className="h-10 rounded-md border bg-background px-2" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PayMethod })}>
          {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button>Ajouter</Button>
      </form>
      <form className="mb-6 flex max-w-md gap-2" onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.from("expense_categories").insert({ name: cat }); if (error) toast.error(error.message); else { setCat(""); refetch(); } }}>
        <Input placeholder="Nouvelle catégorie" value={cat} onChange={(e) => setCat(e.target.value)} required /><Button variant="secondary">Créer</Button>
      </form>
      <div className="space-y-2">
        {data?.list.map((e) => (
          <div key={e.id} className="flex justify-between rounded-lg border bg-card p-3 text-sm">
            <span>{dateFr(e.date)} · {e.expense_categories?.name} · {e.description} · {METHOD_LABEL[e.method]}</span><b>{fcfa(e.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
