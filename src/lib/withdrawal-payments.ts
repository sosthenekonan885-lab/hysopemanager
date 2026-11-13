import type { PayMethod } from "@/lib/format";

type Withdrawal = { amount: number; method: PayMethod | null; order_id: string | null };
type Payment = { order_id: string; amount: number; method: PayMethod; context: string; cash_confirmed_at: string | null };

/** Use the journal once; known payment records only resolve historical unknown methods. */
export function withdrawalReceipts(withdrawals: Withdrawal[], payments: Payment[]) {
  const totals = { especes: 0, wave: 0, orange_money: 0, unknown: 0, cash: 0 };
  for (const withdrawal of withdrawals) {
    const linked = payments.filter((p) => p.order_id === withdrawal.order_id);
    const pendingCash = linked.filter((p) => p.method === "especes" && p.context === "livraison" && !p.cash_confirmed_at).reduce((sum, p) => sum + p.amount, 0);
    if (withdrawal.method) {
      totals[withdrawal.method] += withdrawal.amount;
      if (withdrawal.method === "especes") totals.cash += Math.max(0, withdrawal.amount - pendingCash);
    } else if (linked.length && linked.reduce((sum, p) => sum + p.amount, 0) === withdrawal.amount) {
      for (const p of linked) {
        totals[p.method] += p.amount;
        if (p.method === "especes" && (p.context !== "livraison" || p.cash_confirmed_at)) totals.cash += p.amount;
      }
    } else {
      totals.unknown += withdrawal.amount;
    }
  }
  return totals;
}