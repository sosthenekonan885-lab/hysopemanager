import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";

const { writes, navigate } = vi.hoisted(() => ({ writes: vi.fn(), navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate, Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/hooks/use-me", () => ({ useMe: () => ({ data: { id: "staff", isAdmin: false, profile: {} } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let payload: unknown;
  const chain = {
    select: () => chain, order: () => chain, eq: () => chain, or: () => chain, limit: () => chain,
    insert: (input: unknown) => { payload = input; writes(table, input); return chain; },
    single: async () => ({ data: { id: table === "orders" ? "invoice" : "partner" }, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (input: unknown) => unknown) => resolve({ data: payload ? null : [], error: null }),
  };
  return chain;
} } }));
import { NewOrder } from "./NewOrder";
afterEach(() => { cleanup(); writes.mockClear(); navigate.mockClear(); });

it("enregistre une facture professionnelle avec un article libre et le montant partiellement encaissé", async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><NewOrder professional /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "+ Nouveau client" }));
  fireEvent.change(screen.getByLabelText("Nom de l’établissement"), { target: { value: "Résidence Affoué" } });
  fireEvent.change(screen.getByLabelText("Nom au singulier"), { target: { value: "Serviette" } });
  fireEvent.change(screen.getByLabelText("Genre grammatical"), { target: { value: "feminin" } });
  fireEvent.change(screen.getByLabelText("Prix unitaire (F)"), { target: { value: "500" } });
  fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Ajouter l’article" }));
  await waitFor(() => expect(screen.getByText("Serviettes", { exact: true })).toBeVisible());
  fireEvent.click(screen.getByRole("radio", { name: "Avance" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Montant de l'avance" }), { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("button", { name: "Valider et imprimer le reçu" }));
  await waitFor(() => expect(writes).toHaveBeenCalledWith("payments", expect.objectContaining({ amount: 1000, method: "especes", context: "depot" })));
  expect(writes).toHaveBeenCalledWith("clients", expect.objectContaining({ name: "RÉSIDENCE AFFOUÉ", is_pro: true }));
  expect(writes).toHaveBeenCalledWith("orders", expect.objectContaining({ client_id: "partner", receipt_type: "pro" }));
  expect(writes).toHaveBeenCalledWith("order_items", [expect.objectContaining({ quantity: 5, unit_price: 500, grammatical_gender: "feminin", plural_name: "Serviettes" })]);
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ params: { id: "invoice" } }));
});