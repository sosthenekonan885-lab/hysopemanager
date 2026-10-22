import { describe, it, expect } from "vitest";
import { orderNo, theoreticalCash, paymentStatus, LOCKERS, isWeekend } from "../format";

describe("règles Hysope", () => {
  it("numérote les commandes sur 6 chiffres à partir de 000001", () => {
    expect(orderNo(1)).toBe("N°000001");
    expect(orderNo(47)).toBe("N°000047");
  });
  it("dispose de 32 casiers C01 à C32", () => {
    expect(LOCKERS).toHaveLength(32);
    expect(LOCKERS[0]).toBe("C01");
    expect(LOCKERS[31]).toBe("C32");
  });
  it("calcule la caisse théorique", () => {
    expect(
      theoreticalCash({ opening: 10000, cashPayments: 85000, cashExpenses: 5000, movements: [{ kind: "coopec", amount: 2500 }] }),
    ).toBe(87500);
  });
  it("statut de paiement", () => {
    expect(paymentStatus(15000, 0)).toBe("Non payée");
    expect(paymentStatus(15000, 5000)).toBe("Avance versée");
    expect(paymentStatus(15000, 15000)).toBe("Payée");
  });
  it("détecte le week-end (fonds 15 000 F)", () => {
    expect(isWeekend("2026-10-24")).toBe(true);
    expect(isWeekend("2026-10-22")).toBe(false);
  });
});
