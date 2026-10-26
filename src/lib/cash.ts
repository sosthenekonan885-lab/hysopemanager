import { supabase } from "@/integrations/supabase/client";
import { isWeekend, theoreticalCash } from "@/lib/format";

/** Chiffres d'une période [from, to] (dates ISO incluses). */
export async function periodStats(from: string, to: string) {
  const start = new Date(from + "T00:00:00").toISOString();
  const end = new Date(new Date(to + "T00:00:00").getTime() + 864e5).toISOString();
  const [paysAll, exps, mvs, orders, settings, closings, wds, live] = await Promise.all([
    supabase.from("payments").select("amount,method,context,cash_confirmed_at,created_at").gte("created_at", start).lt("created_at", end),
    supabase.from("expenses").select("amount,method,date,category_id").gte("date", from).lte("date", to),
    supabase.from("cash_movements").select("*").gte("date", from).lte("date", to),
    supabase.from("order_summary").select("number,status,final_total,paid,balance,created_at").gte("created_at", start).lt("created_at", end),
    supabase.from("settings").select("*"),
    supabase.from("cash_closings").select("*").gte("date", from).lte("date", to).order("date"),
    supabase.from("withdrawals").select("*").gte("date", from).lte("date", to).order("date"),
    supabase.from("orders").select("status").in("status", ["en_cours", "pret", "a_livrer"]),
  ]);
  // Les avances des anciens reçus papier ont déjà été encaissées avant le logiciel : exclues des recettes.
  const p = (paysAll.data ?? []).filter((x) => x.context !== "ancien");
  const withdrawals = wds.data ?? [];
  const liveStatus = live.data ?? [];
  const sum = (a: { amount: number }[]) => a.reduce((s, x) => s + x.amount, 0);
  const cashIn = p.filter((x) => x.method === "especes" && (x.context !== "livraison" || x.cash_confirmed_at));
  const cfg = Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value]));
  const opening = Number(isWeekend(from) ? cfg['fonds_weekend'] : cfg['fonds_semaine']) || 0;
  const expenses = exps.data ?? [];
  const movements = mvs.data ?? [];
  const o = (orders.data ?? []).filter((x) => x.status !== "annule");
  return {
    opening,
    // Recettes = encaissé au dépôt + encaissé au retrait/livraison (journal des retraits) — chaque franc compté une fois.
    revenue: sum(p.filter((x) => x.context === "depot")) + sum(withdrawals),
    depositCash: sum(p.filter((x) => x.context === "depot")),
    withdrawalsCount: withdrawals.length,
    withdrawalsAmount: sum(withdrawals),
    withdrawals,
    readyNow: liveStatus.filter((x) => x.status === "pret" || x.status === "a_livrer").length,
    inProgressNow: liveStatus.filter((x) => x.status === "en_cours").length,
    ordersList: o,
    especes: sum(p.filter((x) => x.method === "especes")),
    wave: sum(p.filter((x) => x.method === "wave")),
    om: sum(p.filter((x) => x.method === "orange_money")),
    avances: sum(p.filter((x) => x.context === "depot")),
    expenses: sum(expenses),
    orders: o.length,
    ordersValue: o.reduce((s, x) => s + (x.final_total ?? 0), 0),
    remaining: o.reduce((s, x) => s + (x.balance ?? 0), 0),
    movements,
    closings: closings.data ?? [],
    payments: p,
    theoretical: theoreticalCash({
      opening,
      cashPayments: sum(cashIn),
      cashExpenses: sum(expenses.filter((e) => e.method === "especes")),
      movements,
    }),
  };
}
