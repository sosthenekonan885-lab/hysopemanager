import { describe, expect, it } from "vitest";
import { automaticWithdrawalOrder, availableWithdrawalOrders, type WithdrawalOrder } from "../withdrawal-matching";

const order = (number: number, status: WithdrawalOrder["status"] = "pret"): WithdrawalOrder => ({ id: `order-${number}`, number, client_name: "Mme Konan", client_phone: "0700000000", status, balance: 2500, pickup_date: "2026-11-12" });

describe("retrait sans reçu papier", () => {
  it("réutilise le numéro existant de l'unique commande prête", () => {
    expect(automaticWithdrawalOrder(availableWithdrawalOrders([order(27)], []))?.number).toBe(27);
  });
  it("ne propose pas une commande qui n'est pas prête", () => {
    expect(availableWithdrawalOrders([order(27, "en_cours"), order(28, "pret"), order(29, "a_livrer")], []).map((o) => o.number)).toEqual([28]);
  });
  it("demande un choix si plusieurs commandes sont prêtes", () => {
    expect(automaticWithdrawalOrder([order(27), order(28)])).toBeUndefined();
  });
  it("exclut les reçus déjà enregistrés au journal des retraits", () => {
    expect(availableWithdrawalOrders([order(27), order(28)], [27]).map((o) => o.number)).toEqual([28]);
  });
});