import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

const { writes, ready } = vi.hoisted(() => ({ writes: vi.fn(), ready: [{ id: "order-27", number: 27, client_name: "Mme Konan", client_phone: "0700000000", status: "pret", balance: 2500, pickup_date: "2026-11-12" }] }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => <select aria-label="Mode de paiement" value={value} onChange={(e) => onValueChange(e.target.value)}><option value="">Choisir</option>{children}</select>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let insert = false;
  const chain = {
    select: () => chain, gte: () => chain, lte: () => chain, order: () => chain, or: () => chain, in: () => chain, eq: () => chain,
    maybeSingle: async () => ({ data: { id: "order-27" }, error: null }),
    insert: (payload: unknown) => { insert = true; writes(payload); return chain; },
    then: (resolve: (value: unknown) => unknown) => resolve({ error: null, data: insert ? null : table === "clients" ? [{ id: "client-1" }] : table === "order_summary" ? ready : [] }),
  };
  return chain;
} } }));

import { Route } from "@/routes/_authenticated/retraits";
afterEach(() => { cleanup(); writes.mockClear(); });

describe("formulaire de retrait", () => {
  it("enregistre sans reçu et sans attribuer un numéro", async () => {
    const Form = (Route as unknown as { component: ComponentType }).component;
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Form /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Konan" } });
    fireEvent.change(screen.getByLabelText("Mode de paiement"), { target: { value: "especes" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() => expect(writes).toHaveBeenCalledWith(expect.objectContaining({ receipt_no: null, order_id: null, client_name: "Konan", amount: 0 })));
  });
  it("conserve le numéro saisi 000027", async () => {
    const Form = (Route as unknown as { component: ComponentType }).component;
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Form /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Konan" } });
    fireEvent.change(screen.getByLabelText("N° du reçu (facultatif)"), { target: { value: "000027" } });
    fireEvent.change(screen.getByLabelText("Mode de paiement"), { target: { value: "wave" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() => expect(writes).toHaveBeenCalledWith(expect.objectContaining({ receipt_no: 27, order_id: "order-27" })));
  });
  it("refuse un retrait sans mode de paiement", async () => {
    const Form = (Route as unknown as { component: ComponentType }).component;
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Form /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Konan" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(writes).not.toHaveBeenCalled();
  });
  it.each(["especes", "wave", "orange_money"])("enregistre le mode %s avec le retrait", async (method) => {
    const Form = (Route as unknown as { component: ComponentType }).component;
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Form /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Nom du client"), { target: { value: "Konan" } });
    fireEvent.change(screen.getByLabelText("Mode de paiement"), { target: { value: method } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() => expect(writes).toHaveBeenCalledWith(expect.objectContaining({ method, receipt_no: null })));
  });
});
