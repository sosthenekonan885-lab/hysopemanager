// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Pill } from "@/components/hysope/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fcfa, todayISO, dateTimeFr } from "@/lib/format";
import { periodStats } from "@/lib/cash";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({ meta: [{ title: "Caisse — Hysope Manager" }] }),
  component: Caisse,
});

const KIND = { coopec: "Collecte COOPEC", credit_access: "Collecte Crédit Access", entree: "Autre entrée", sortie: "Autre sortie" } as const;

function Caisse() {
  const { data: me } = useMe();
  const [day, setDay] = useState(todayISO());
  const [mv, setMv] = useState({ kind: "coopec" as keyof typeof KIND, amount: 0, description: "" });
  const [counted, setCounted] = useState(0);
  const [reason, setReason] = useState("");
  const { data: s, refetch } = useQuery({ queryKey: ["cash", day], queryFn: () => periodStats(day, day) });
  const closing = s?.closings[0];
  const gap = counted - (s?.theoretical ?? 0);

  return (
    <div>
      <PageHeader title="Caisse" subtitle="Fonds de caisse, mouvements et clôture du jour." />
      <Input type="date" className="mb-4 w-48" value={day} onChange={(e) => setDay(e.target.value)} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Fonds initial" value={fcfa(s?.opening)} />
        <Stat label="Espèces" value={fcfa(s?.especes)} />
        <Stat label="Wave" value={fcfa(s?.wave)} />
        <Stat label="Orange Money" value={fcfa(s?.om)} />
        <Stat label="Caisse théorique" value={fcfa(s?.theoretical)} accent />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Mouvements de caisse</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {s?.movements.map((m) => (
              <div key={m.id} className="flex justify-between rounded-lg border p-2 text-sm">
                <span>{KIND[m.kind as keyof typeof KIND]} · {m.description}</span>
                <b>{m.kind === "entree" ? "+" : "−"}{fcfa(m.amount)}</b>
              </div>
            ))}
            {!closing && (
              <form className="grid gap-2 border-t pt-3" onSubmit={async (e) => {
                e.preventDefault();
                const { error } = await supabase.from("cash_movements").insert({ ...mv, date: day });
                if (error) toast.error(error.message); else { toast.success("Mouvement enregistré"); setMv({ ...mv, amount: 0, description: "" }); refetch(); }
              }}>
                <select className="h-10 rounded-md border bg-background px-2" value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value as keyof typeof KIND })}>
                  {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input type="number" placeholder="Montant" value={mv.amount || ""} onChange={(e) => setMv({ ...mv, amount: +e.target.value })} required />
                <Input placeholder="Description" value={mv.description} onChange={(e) => setMv({ ...mv, description: e.target.value })} />
                <Button variant="secondary">Ajouter</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clôture du jour</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {closing ? (
              <>
                <Pill tone="success">Journée clôturée</Pill>
                <p>Théorique : <b>{fcfa(closing.theoretical)}</b> · Compté : <b>{fcfa(closing.counted)}</b></p>
                <p>Écart : <b className={closing.gap ? "text-destructive" : ""}>{fcfa(closing.gap)}</b> {closing.reason && `— ${closing.reason}`}</p>
                <p className="text-muted-foreground">{dateTimeFr(closing.closed_at)}</p>
              </>
            ) : !me?.isAdmin ? (
              <p className="text-muted-foreground">La clôture est faite par un administrateur.</p>
            ) : (
              <>
                <p>Caisse théorique : <b>{fcfa(s?.theoretical)}</b></p>
                <Label>Caisse réellement comptée</Label>
                <Input type="number" value={counted || ""} onChange={(e) => setCounted(+e.target.value)} />
                <p>Écart : <b className={gap ? "text-destructive" : "text-success"}>{fcfa(gap)}</b></p>
                {gap !== 0 && <Input placeholder="Motif de l'écart (obligatoire)" value={reason} onChange={(e) => setReason(e.target.value)} />}
                <Button className="w-full" onClick={async () => {
                  if (gap !== 0 && !reason.trim()) return toast.error("Le motif est obligatoire en cas d'écart");
                  const { error } = await supabase.from("cash_closings").insert({ date: day, opening: s!.opening, theoretical: s!.theoretical, counted, gap, reason: reason || null });
                  if (error) toast.error(error.message); else { toast.success("Journée clôturée"); refetch(); }
                }}>Clôturer la journée</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
