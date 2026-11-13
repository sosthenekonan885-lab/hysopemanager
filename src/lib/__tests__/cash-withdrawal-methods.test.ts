import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const data = table === "withdrawals" ? [
    { amount: 1000, method: "especes", order_id: null },
    { amount: 2000, method: "wave", order_id: "o" },
    { amount: 3000, method: "orange_money", order_id: null },
    { amount: 4500, method: null, order_id: null },
  ] : table === "payments" ? [
    { order_id: "deposit", amount: 500, method: "especes", context: "depot", created_at: "2026-11-13T10:00:00Z", cash_confirmed_at: null },
    { order_id: "o", amount: 2000, method: "wave", context: "retrait", created_at: "2026-11-13T10:00:00Z", cash_confirmed_at: null },
  ] : table === "settings" ? [{ key: "fonds_semaine", value: 10000 }] : [];
  const chain = { select: () => chain, gte: () => chain, lt: () => chain, lte: () => chain, order: () => chain, in: () => chain, then: (resolve: (value: unknown) => unknown) => resolve({ data, error: null }) };
  return chain;
} } }));

import { periodStats } from "@/lib/cash";

describe("rapport journalier", () => {
  it("inclut les retraits par mode sans doubler les paiements liés", async () => {
    const stats = await periodStats("2026-11-13", "2026-11-13");
    expect(stats.revenue).toBe(11000);
    expect(stats.especes).toBe(1500);
    expect(stats.wave).toBe(2000);
    expect(stats.om).toBe(3000);
    expect(stats.unknownMethod).toBe(4500);
    expect(stats.theoretical).toBe(11500);
  });
});