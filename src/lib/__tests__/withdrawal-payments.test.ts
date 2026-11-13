import { describe, expect, it } from "vitest";
import { withdrawalReceipts } from "@/lib/withdrawal-payments";

describe("recettes des retraits", () => {
  it("répartit chaque montant entre Espèces, Wave et OM", () => {
    expect(withdrawalReceipts([
      { amount: 1000, method: "especes", order_id: null },
      { amount: 2000, method: "wave", order_id: null },
      { amount: 3000, method: "orange_money", order_id: null },
    ], [])).toEqual({ especes: 1000, wave: 2000, orange_money: 3000, unknown: 0, cash: 1000 });
  });
  it("ne compte pas deux fois le paiement lié à une commande", () => {
    expect(withdrawalReceipts([{ amount: 2500, method: "wave", order_id: "o" }], [{ order_id: "o", amount: 2500, method: "wave", context: "retrait", cash_confirmed_at: null }]).wave).toBe(2500);
  });
  it("préserve les montants historiques sans inventer leur mode", () => {
    expect(withdrawalReceipts([{ amount: 4500, method: null, order_id: null }], [])).toEqual({ especes: 0, wave: 0, orange_money: 0, unknown: 4500, cash: 0 });
  });
  it("retrouve les modes mixtes historiques sans doublon", () => {
    expect(withdrawalReceipts([{ amount: 3000, method: null, order_id: "o" }], [
      { order_id: "o", amount: 1000, method: "especes", context: "retrait", cash_confirmed_at: null },
      { order_id: "o", amount: 2000, method: "wave", context: "retrait", cash_confirmed_at: null },
    ])).toEqual({ especes: 1000, wave: 2000, orange_money: 0, unknown: 0, cash: 1000 });
  });
  it("exclut les espèces non remises par le livreur de la caisse", () => {
    expect(withdrawalReceipts([{ amount: 1000, method: "especes", order_id: "o" }], [{ order_id: "o", amount: 1000, method: "especes", context: "livraison", cash_confirmed_at: null }]).cash).toBe(0);
  });
});