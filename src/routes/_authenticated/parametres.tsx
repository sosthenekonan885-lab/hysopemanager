import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, AdminOnly } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Hysope Manager" }] }),
  component: () => { const { data: me } = useMe(); return <AdminOnly isAdmin={me?.isAdmin}><Settings /></AdminOnly>; },
});

const FIELDS = [["fonds_semaine", "Fonds de caisse — jours ordinaires (F)", "number"], ["fonds_weekend", "Fonds de caisse — week-ends (F)", "number"], ["livreur_defaut", "Livreur par défaut", "text"]] as const;
const EXPORT = ["clients", "orders", "order_items", "payments", "expenses", "cash_movements", "cash_closings", "complaints", "order_requests", "services", "price_categories"] as const;

function Settings() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => Object.fromEntries(((await supabase.from("settings").select("*")).data ?? []).map((s) => [s.key, s.value])) });
  async function backup() {
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const t of EXPORT) out[t] = (await supabase.from(t).select("*")).data;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
    a.download = `sauvegarde-hysope-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    await supabase.from("audit_log").insert({ table_name: "sauvegarde", action: "export", user_id: (await supabase.auth.getUser()).data.user!.id });
    toast.success("Sauvegarde téléchargée");
  }
  if (!data) return null;
  return (
    <div>
      <PageHeader title="Paramètres" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Caisse & livraison</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault(); const f = new FormData(e.currentTarget);
              for (const [k, , type] of FIELDS) {
                const v = String(f.get(k)); await supabase.from("settings").upsert({ key: k, value: type === "number" ? Number(v) : v });
              }
              toast.success("Paramètres enregistrés");
            }}>
              {FIELDS.map(([k, label, type]) => <div key={k} className="space-y-1"><Label>{label}</Label><Input name={k} type={type} defaultValue={String(data[k] ?? "")} /></div>)}
              <Button>Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sauvegardes</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Les données sont sauvegardées automatiquement chaque jour. Vous pouvez aussi télécharger une copie complète à garder.</p>
            <Button variant="secondary" onClick={backup}>Télécharger une sauvegarde</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
