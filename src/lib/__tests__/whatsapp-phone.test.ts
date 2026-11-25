import { describe, expect, it } from "vitest";
import { waPhone, REMINDER_DAYS } from "../whatsapp-phone";
describe("waPhone", () => {
  it("ajoute 225 aux numéros ivoiriens à 10 chiffres", () => expect(waPhone("07 57 32 14 89")).toBe("2250757321489"));
  it("garde un numéro déjà international", () => expect(waPhone("+225 05 45 51 92 36")).toBe("2250545519236"));
  it("refuse un numéro trop court", () => expect(waPhone("1234")).toBeNull());
  it("rappel après 7 jours", () => expect(REMINDER_DAYS).toBe(7));
});
