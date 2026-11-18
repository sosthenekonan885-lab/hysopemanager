import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestPlural } from "@/lib/article-language";

export type FreeArticle = { designation: string; singular_name: string; plural_name: string; grammatical_gender: string; quantity: number; unit_price: number };
export function ArticleEditor({ onAdd, allowRemember = true }: { onAdd: (article: FreeArticle, remember: boolean) => Promise<void> | void; allowRemember?: boolean }) {
  const [name, setName] = useState("");
  const [plural, setPlural] = useState("");
  const [gender, setGender] = useState("masculin");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  return <form className="grid gap-3 border-t pt-4 sm:grid-cols-2" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await onAdd({ designation: name.trim(), singular_name: name.trim(), plural_name: plural.trim(), grammatical_gender: gender, unit_price: Number(price), quantity }, remember); setName(""); setPlural(""); setPrice(""); setQuantity(1); }
    catch { /* The caller displays the storage error; keep entered values for retry. */ }
    finally { setBusy(false); }
  }}>
    <h3 className="font-semibold sm:col-span-2">Article personnalisé</h3>
    <Label>Nom au singulier<Input aria-label="Nom au singulier" required value={name} onChange={(e) => { setName(e.target.value); setPlural(suggestPlural(e.target.value)); }} /></Label>
    <Label>Nom au pluriel<Input aria-label="Nom au pluriel" required value={plural} onChange={(e) => setPlural(e.target.value)} /></Label>
    <Label>Genre grammatical<select aria-label="Genre grammatical" className="h-10 w-full rounded-md border bg-background px-3" value={gender} onChange={(e) => setGender(e.target.value)}><option value="masculin">Masculin</option><option value="feminin">Féminin</option></select></Label>
    <Label>Prix unitaire (F)<Input aria-label="Prix unitaire (F)" type="number" min={1} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} /></Label>
    <Label>Quantité<Input aria-label="Quantité" type="number" min={1} step={1} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Label>
    {allowRemember && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Conserver pour les prochains reçus</label>}
    <Button type="submit" variant="secondary" disabled={busy}>Ajouter l’article</Button>
  </form>;
}