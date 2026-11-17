import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ArticleEditor } from "./ArticleEditor";
import { fcfa } from "@/lib/format";

export function PartnerPrices({ clientId }: { clientId: string }) {
  const { data, refetch } = useQuery({ queryKey: ["partner-prices", clientId], queryFn: async () => {
    const { data, error } = await supabase.from("partner_prices").select("*").eq("client_id", clientId).order("designation");
    if (error) throw error; return data ?? [];
  } });
  return <section className="mt-6 space-y-3 border-t pt-5">
    <h2 className="text-xl font-bold">Tarifs habituels de l’établissement</h2>
    {data?.map((p) => <div className="flex flex-wrap items-center gap-3 border-b py-2" key={p.id}>
      <span className="min-w-0 flex-1 font-medium">{p.designation}</span><span className="text-sm text-muted-foreground">{fcfa(p.unit_price)}</span>
      <Input aria-label={`Tarif ${p.designation}`} className="w-28" type="number" min={1} defaultValue={p.unit_price} onBlur={async (e) => {
        const price = Number(e.target.value); if (!Number.isInteger(price) || price <= 0 || price === p.unit_price) return;
        const { error } = await supabase.from("partner_prices").update({ unit_price: price }).eq("id", p.id);
        if (error) toast.error(error.message); else { toast.success("Tarif enregistré"); refetch(); }
      }} />
    </div>)}
    <ArticleEditor allowRemember={false} onAdd={async (article) => {
      const { quantity: _quantity, ...fields } = article;
      const { error } = await supabase.from("partner_prices").upsert({ ...fields, client_id: clientId }, { onConflict: "client_id,designation" });
      if (error) { toast.error(error.message); throw error; } toast.success("Tarif enregistré"); await refetch();
    }} />
  </section>;
}