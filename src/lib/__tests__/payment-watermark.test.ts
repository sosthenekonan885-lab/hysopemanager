import { describe, it, expect } from "vitest";
import { paymentWatermark } from "../format";
import { parseTrackQr } from "@/components/hysope/ReceiptQr";

describe("filigrane de paiement", () => {
  it("NON PAYÉ tant qu'il reste à payer", () => expect(paymentWatermark(500, "pret")).toBe("NON PAYÉ"));
  it("PAYÉ – NON LIVRÉ si soldé mais pas retiré", () => expect(paymentWatermark(0, "pret")).toBe("PAYÉ – NON LIVRÉ"));
  it("PAYÉ – LIVRÉ si soldé et retiré", () => expect(paymentWatermark(0, "retire")).toBe("PAYÉ – LIVRÉ"));
  it("PAYÉ – LIVRÉ si soldé et livré", () => expect(paymentWatermark(0, "livre")).toBe("PAYÉ – LIVRÉ"));
});
describe("lecture du QR", () => {
  it("nouveau QR à code secret", () => expect(parseTrackQr("https://hysopemanager.lovable.app/suivi?t=0b7c8e2a-1f2d-4c3b-9a8e-123456789abc")).toEqual({ token: "0b7c8e2a-1f2d-4c3b-9a8e-123456789abc" }));
  it("ancien QR par numéro", () => expect(parseTrackQr("https://hysopemanager.lovable.app/suivi?n=000047")).toEqual({ number: 47 }));
});
