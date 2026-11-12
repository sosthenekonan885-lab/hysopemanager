import type { Database } from "@/integrations/supabase/types";

export type WithdrawalOrder = Pick<Database["public"]["Views"]["order_summary"]["Row"], "id" | "number" | "client_name" | "client_phone" | "status" | "balance" | "pickup_date">;

export function availableWithdrawalOrders(orders: WithdrawalOrder[], withdrawn: number[]) {
  const receipts = new Set(withdrawn);
  return orders.filter((o) => o.status === "pret" && o.id && o.number && !receipts.has(o.number));
}

export function automaticWithdrawalOrder(orders: WithdrawalOrder[]) {
  return orders.length === 1 ? orders[0] : undefined;
}