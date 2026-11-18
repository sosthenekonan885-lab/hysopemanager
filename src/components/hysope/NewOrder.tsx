import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COLORS, METHOD_LABEL, fcfa, type PayMethod } from "@/lib/format";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { ArticleEditor, type FreeArticle } from "@/components/hysope/ArticleEditor";
import { articleLabel, clientName, defaultGrammar, PARTNER_ARTICLES, type Grammar } from "@/lib/article-language";

type Line = Grammar & { key: number; service_id: string | null; designation: string; quantity: number; unit_price: number; colors: string[]; observation: string; variable: boolean; min?: number | null; max?: number | null };

export function NewOrder({ initialClient, professional = false }: { initialClient?: string | undefined; professional?: boolean }) {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [clientId, setClientId] = useState<string | null>(initialClient ?? null);
  const [clientQ, setClientQ] = useState("");
  const [newClient, setNewClient] = useState<null | { title: string; name: string; phone: string; whatsapp: string; address: string; quartier: string; notes: string; is_pro: boolean; establishment_type: string; contact_person: string; contact_phone: string }>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [pickup, setPickup] = useState(() => new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  const [mode, setMode] = useState<"retrait" | "livraison">("retrait");
  const [payOpt, setPayOpt] = useState<"integral" | "avance" | "retrait">("retrait");
  const [advance, setAdvance] = useState(0);
  const [method, setMethod] = useState<PayMethod>("especes");
  const [receiptType, setReceiptType] = useState<"particulier" | "pro">(professional ? "pro" : "particulier");
  const [orderNotes, setOrderNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("price_categories").select("*, services(*)").eq("active", true).order("sort");
      return (data ?? []).map((c) => ({ ...c, services: c.services.filter((s) => s.active).sort((a, b) => a.sort - b.sort) }));
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["client-search", clientQ, professional],
    enabled: clientQ.length >= 2,
    queryFn: async () => {
      const term = clientQ.trim().replace(/[,%()]/g, " ");
      let query = supabase.from("clients").select("*").or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      if (professional) query = query.eq("is_pro", true);
      const { data, error } = await query.limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    enabled: !!clientId,
    queryFn: async () => { if (!clientId) return null; const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single(); if (error) throw error; return data; },
  });

  const { data: custom, refetch: refetchCustom } = useQuery({ queryKey: ["custom-articles"], queryFn: async () => { const { data, error } = await supabase.from("custom_articles").select("*").order("name"); if (error) throw error; return data ?? []; } });
  const { data: partnerPrices, refetch: refetchPartner } = useQuery({ queryKey: ["partner-prices", clientId], enabled: !!clientId && professional, queryFn: async () => { if (!clientId) return []; const { data, error } = await supabase.from("partner_prices").select("*").eq("client_id", clientId); if (error) throw error; return data ?? []; } });
  const partnerType = client?.establishment_type ?? newClient?.establishment_type ?? "Résidence";
  const addFree = async (article: FreeArticle, remember: boolean) => {
    if (remember) {
      if (professional && clientId) {
        const { quantity: _quantity, ...fields } = article;
        const { error } = await supabase.from("partner_prices").upsert({ ...fields, client_id: clientId }, { onConflict: "client_id,designation" });
        if (error) { toast.error(error.message); throw error; } await refetchPartner();
      } else {
        const { data: existing } = await supabase.from("custom_articles").select("id").eq("name", article.designation).maybeSingle();
        if (!existing) { const { error } = await supabase.from("custom_articles").insert({ name: article.designation, singular_name: article.singular_name, plural_name: article.plural_name, grammatical_gender: article.grammatical_gender, unit_price: article.unit_price }); if (error) { toast.error(error.message); throw error; } }
        await refetchCustom();
      }
    }
    setLines((ls) => [...ls, { ...article, key: Date.now() + Math.random(), service_id: null, colors: [], observation: "", variable: true }]);
  };
  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), [lines]);
  const activeCat = cats?.find((c) => c.id === catId) ?? cats?.[0];

  const addService = (s: NonNullable<typeof activeCat>["services"][number]) =>
    setLines((ls) => [...ls, { key: Date.now() + Math.random(), service_id: s.id, designation: s.name, ...defaultGrammar(s.name), ...(s.grammatical_gender ? { grammatical_gender: s.grammatical_gender, singular_name: s.singular_name, plural_name: s.plural_name } : {}), quantity: 1, unit_price: s.price ?? 0, colors: [], observation: "", variable: s.variable, min: s.price, max: s.price_max }]);
  const upd = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    if (!clientId && !newClient) return void toast.error("Choisissez ou créez un client");
    if (!lines.length) return void toast.error("Ajoutez au moins un vêtement");
    if (lines.some((l) => !Number.isInteger(l.unit_price) || l.unit_price <= 0 || !Number.isInteger(l.quantity) || l.quantity <= 0)) return void toast.error("Indiquez le prix des articles « selon la taille »");
    const paid = payOpt === "integral" ? total : payOpt === "avance" ? advance : 0;
    if (payOpt === "avance" && (advance <= 0 || advance >= total)) return void toast.error("L'avance doit être comprise entre 0 et le total");
    setBusy(true);
    try {
      let cid = clientId;
      if (professional && newClient && !newClient.establishment_type) throw new Error("Catégorie d’établissement requise");
      if (!cid && newClient) {
        if (!newClient.name.trim()) throw new Error("Nom du client requis");
        const { data, error } = await supabase.from("clients").insert({ ...newClient, name: clientName(newClient.name.trim()), title: newClient.is_pro ? null : newClient.title || null, establishment_type: newClient.is_pro ? newClient.establishment_type || null : null, created_by: (me?.id ?? null) }).select("id").single();
        if (error) throw error;
        cid = data.id;
      }
      if (!cid) throw new Error("Client requis");
      const { data: order, error } = await supabase.from("orders").insert({
        client_id: cid, pickup_date: pickup, delivery_mode: mode, agency_id: me?.profile?.agency_id ?? null, receipt_type: receiptType, notes: orderNotes.trim() || null,
      }).select("id").single();
      if (error) throw error;
      const { error: ie } = await supabase.from("order_items").insert(lines.map((l) => ({
        order_id: order.id, service_id: l.service_id, designation: l.designation, quantity: l.quantity, unit_price: l.unit_price, colors: l.colors, observation: l.observation || null, grammatical_gender: l.grammatical_gender || null, singular_name: l.singular_name || null, plural_name: l.plural_name || null,
      })));
      if (ie) throw ie;
      if (paid > 0) {
        const { error: pe } = await supabase.from("payments").insert({ order_id: order.id, amount: paid, method, context: "depot" });
        if (pe) throw pe;
      }
      toast.success("Commande enregistrée");
      navigate({ to: "/commandes/$id", params: { id: order.id }, search: { print: true } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title={professional ? "Facturation professionnelle" : "Nouveau dépôt"} subtitle="Le numéro de commande est attribué automatiquement." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>1. Client</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {client ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div><div className="font-semibold">{client.title ? `${client.title} ` : ""}{clientName(client.name)}{client.is_pro && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Professionnel{client.establishment_type ? ` · ${client.establishment_type}` : ""}</span>}</div><div className="text-sm text-muted-foreground">{client.phone} · {client.quartier}</div></div>
                  <div className="flex gap-2"><Button asChild variant="ghost" size="sm"><Link to="/clients/$id" params={{ id: client.id }}>Fiche et historique</Link></Button><Button variant="ghost" size="sm" onClick={() => setClientId(null)}>Changer</Button></div>
                </div>
              ) : newClient ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Type de client</Label>
                    <div className="flex gap-2">
                      {([[false, "Particulier"], [true, "Professionnel (hôtel, clinique, restaurant…)"]] as const).filter(([v]) => !professional || v).map(([v, t]) => (
                        <Button key={t} type="button" onClick={() => { setNewClient({ ...newClient, is_pro: v }); setReceiptType(v ? "pro" : "particulier"); }} className={cn("h-auto whitespace-normal rounded-lg border px-3 py-1.5 text-sm", newClient.is_pro === v && "border-primary bg-primary/10 font-semibold")}>{t}</Button>
                      ))}
                    </div>
                  </div>
                  {!newClient.is_pro ? (
                    <div className="space-y-1">
                      <Label>Titre</Label>
                      <div className="flex gap-2">
                        {["M.", "Mme", "Mlle"].map((t) => (
                          <Button key={t} type="button" onClick={() => setNewClient({ ...newClient, name: clientName(newClient.name.trim()), title: t })} className={cn("rounded-lg border px-3 py-1.5 text-sm", newClient.title === t && "border-primary bg-primary/10 font-semibold")}>{t}</Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label>Type d'établissement</Label>
                      <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={newClient.establishment_type} onChange={(e) => setNewClient({ ...newClient, establishment_type: e.target.value })}>
                        <option value="">—</option>{["Résidence", "Hôtel", "Clinique", "Restaurant", "Entreprise", "Autre"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                  {(["name", "phone", "whatsapp", "address", "quartier"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label>{{ name: newClient.is_pro ? "Nom de l'établissement *" : "Nom *", phone: "Téléphone", whatsapp: "WhatsApp", address: "Adresse", quartier: "Quartier" }[k]}</Label>
                      <Input aria-label={{ name: newClient.is_pro ? "Nom de l’établissement" : "Nom du client", phone: "Téléphone", whatsapp: "WhatsApp", address: "Adresse", quartier: "Quartier" }[k]} value={newClient[k]} onChange={(e) => setNewClient({ ...newClient, [k]: k === "name" ? clientName(e.target.value) : e.target.value })} />
                    </div>
                  ))}
                  {newClient.is_pro && (["contact_person", "contact_phone"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label>{k === "contact_person" ? "Personne responsable" : "Contact du responsable"}</Label>
                      <Input value={newClient[k]} onChange={(e) => setNewClient({ ...newClient, [k]: k === "contact_person" ? clientName(e.target.value) : e.target.value })} />
                    </div>
                  ))}
                  <div className="space-y-1 sm:col-span-2"><Label>Informations complémentaires</Label><Textarea value={newClient.notes} onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} /></div>
                  <Button variant="ghost" onClick={() => setNewClient(null)}>Annuler</Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Rechercher un client (nom ou téléphone)…" value={clientQ} onChange={(e) => setClientQ(e.target.value)} />
                  {clients?.map((c) => (
                    <Button key={c.id} onClick={() => { setClientId(c.id); setReceiptType(c.is_pro ? "pro" : "particulier"); }} className="block w-full rounded-lg border p-3 text-left hover:bg-muted">
                      <span className="font-medium">{c.title ? `${c.title} ` : ""}{clientName(c.name)}</span> <span className="text-sm text-muted-foreground">{c.phone}</span>
                    </Button>
                  ))}
                  <Button variant="outline" onClick={() => setNewClient({ title: "", name: clientName(clientQ), phone: "", whatsapp: "", address: "", quartier: "", notes: "", is_pro: professional, establishment_type: professional ? "Résidence" : "", contact_person: "", contact_phone: "" })}>+ Nouveau client</Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Articles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!professional && <><div className="flex flex-wrap gap-2">
                {cats?.map((c) => (
                  <Button key={c.id} onClick={() => setCatId(c.id)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", activeCat?.id === c.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{clientName(c.name)}</Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {activeCat?.services.map((s) => (
                  <Button key={s.id} variant="outline" onClick={() => addService(s)} className="h-auto flex-col items-start whitespace-normal rounded-lg border bg-background p-2.5 text-left text-sm transition hover:border-primary hover:shadow-soft">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.price == null ? "Selon la taille" : s.price_max ? `${fcfa(s.price)} – ${fcfa(s.price_max)}` : fcfa(s.price)}</div>
                  </Button>
                ))}
              </div>
              </>}
              {professional && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(PARTNER_ARTICLES[partnerType] ?? PARTNER_ARTICLES["Résidence"] ?? []).map((a) => {
                  const saved = partnerPrices?.find((p) => p.designation === a.name);
                  return <Button key={a.name} variant="outline" className="h-auto whitespace-normal text-left" onClick={() => addFree({ designation: a.name, singular_name: a.name, plural_name: a.plural, grammatical_gender: a.gender, quantity: 1, unit_price: saved?.unit_price ?? 0 }, false)}>{a.name}</Button>;
                })}
              </div>}
              {(professional ? partnerPrices : custom)?.map((a) => <Button key={a.id} variant="secondary" className="mr-2 h-auto whitespace-normal" onClick={() => addFree({ designation: "designation" in a ? a.designation : a.name, singular_name: a.singular_name, plural_name: a.plural_name, grammatical_gender: a.grammatical_gender, quantity: 1, unit_price: a.unit_price }, false)}>{"designation" in a ? a.designation : a.name} · {fcfa(a.unit_price)}</Button>)}
              <ArticleEditor onAdd={addFree} />
              {lines.map((l) => (
                <div key={l.key} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 font-semibold">{articleLabel(l)}</div>
                    <Input type="number" min={1} className="w-20" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Math.max(1, +e.target.value) })} />
                    <span className="text-sm">×</span>
                    <Input type="number" className="w-28" disabled={!professional && !l.variable && !me?.isAdmin} value={l.unit_price} onChange={(e) => upd(l.key, { unit_price: +e.target.value })} />
                    <span className="w-24 text-right font-semibold">{fcfa(l.quantity * l.unit_price)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select aria-label={`Genre de ${l.designation}`} className="h-9 rounded-md border bg-background px-2 text-sm" value={l.grammatical_gender ?? ""} onChange={(e) => upd(l.key, { grammatical_gender: e.target.value, singular_name: l.singular_name || l.designation, plural_name: l.plural_name || l.designation })}><option value="">Genre non renseigné</option><option value="masculin">Masculin</option><option value="feminin">Féminin</option></select>
                    <Input aria-label={`Singulier de ${l.designation}`} placeholder="Singulier" value={l.singular_name ?? ""} onChange={(e) => upd(l.key, { singular_name: e.target.value })} />
                    <Input aria-label={`Pluriel de ${l.designation}`} placeholder="Pluriel" value={l.plural_name ?? ""} onChange={(e) => upd(l.key, { plural_name: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COLORS.map((c) => (
                      <Button key={c} variant={l.colors.includes(c) ? "default" : "outline"} aria-pressed={l.colors.includes(c)} onClick={() => upd(l.key, { colors: l.colors.includes(c) ? l.colors.filter((x) => x !== c) : [...l.colors, c] })}
                        className={cn("rounded-full border px-2 py-0.5 text-xs", l.colors.includes(c) && "border-primary bg-primary/10 font-semibold text-primary")}>{c}</Button>
                    ))}
                    <input placeholder="+ autre couleur" className="w-28 rounded-full border bg-background px-2 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { e.preventDefault(); upd(l.key, { colors: [...l.colors, e.currentTarget.value.trim()] }); e.currentTarget.value = ""; } }} />
                    {l.colors.filter((c) => !COLORS.includes(c)).map((c) => <span key={c} className="rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs text-primary">{c}</span>)}
                  </div>
                  <Input placeholder="Observation (tache sur manche, bouton manquant…)" value={l.observation} onChange={(e) => upd(l.key, { observation: e.target.value })} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader><CardTitle>3. Récapitulatif</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">Total commande</span><span className="font-display text-3xl font-bold">{fcfa(total)}</span></div>
            {!professional && <div className="space-y-1">
              <Label>Modèle de reçu</Label>
              <div className="grid grid-cols-2 gap-2">
                {([["particulier", "Particulier"], ["pro", "Professionnel"]] as const).map(([k, v]) => (
                  <Button key={k} type="button" onClick={() => setReceiptType(k)} className={cn("rounded-lg border p-2 text-sm", receiptType === k && "border-primary bg-primary/10 font-semibold")}>{v}</Button>
                ))}
              </div>
            </div>
            }<div className="space-y-1"><Label>Date prévue de retrait / livraison</Label><Input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
            {receiptType === "pro" && <div className="space-y-1"><Label>Observations (sur le reçu)</Label><Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} /></div>}
            <div className="space-y-1">
              <Label>Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["retrait", "livraison"] as const).map((m) => (
                  <Button key={m} variant={mode === m ? "default" : "outline"} className={cn("h-auto whitespace-normal rounded-lg border p-2 text-sm disabled:opacity-40", mode === m && "border-primary bg-primary/10 font-semibold")} disabled={m === "livraison" && !!client && !client.delivery_eligible} onClick={() => setMode(m)}>
                    {m === "retrait" ? "Retrait au pressing" : "Livraison à domicile"}</Button>
                ))}
              </div>
              {client && !client.delivery_eligible && <p className="text-xs text-muted-foreground">Client non éligible à la livraison (réglage administrateur).</p>}
            </div>
            <div className="space-y-1">
              <Label>Paiement</Label>
              {([["integral", "Paiement intégral"], ["avance", "Avance"], ["retrait", "Paiement au retrait"]] as const).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" checked={payOpt === k} onChange={() => setPayOpt(k)} />{v}</label>
              ))}
            </div>
            {payOpt === "avance" && <div className="space-y-1"><Label htmlFor="deposit-advance">Montant de l'avance</Label><Input id="deposit-advance" type="number" value={advance} onChange={(e) => setAdvance(+e.target.value)} /><p className="text-sm">Solde restant : <b>{fcfa(total - advance)}</b></p></div>}
            {payOpt !== "retrait" && (
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => (
                  <Button key={m} onClick={() => setMethod(m)} className={cn("rounded-lg border p-2 text-xs", method === m && "border-primary bg-primary/10 font-semibold")}>{METHOD_LABEL[m]}</Button>
                ))}
              </div>
            )}
            <Button size="lg" className="w-full" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Valider et imprimer le reçu"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
