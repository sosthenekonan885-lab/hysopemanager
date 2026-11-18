import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ArticleEditor } from "./ArticleEditor";

afterEach(cleanup);
it("transmet un article libre avec sa quantité, son prix et ses formes réutilisables", async () => {
  const add = vi.fn();
  render(<ArticleEditor onAdd={add} />);
  fireEvent.change(screen.getByLabelText("Nom au singulier"), { target: { value: "Serviette" } });
  fireEvent.change(screen.getByLabelText("Nom au pluriel"), { target: { value: "Serviettes" } });
  fireEvent.change(screen.getByLabelText("Genre grammatical"), { target: { value: "feminin" } });
  fireEvent.change(screen.getByLabelText("Prix unitaire (F)"), { target: { value: "500" } });
  fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "5" } });
  fireEvent.click(screen.getByLabelText("Conserver pour les prochains reçus"));
  fireEvent.click(screen.getByRole("button", { name: "Ajouter l’article" }));
  await waitFor(() => expect(add).toHaveBeenCalledWith({ designation: "Serviette", singular_name: "Serviette", plural_name: "Serviettes", grammatical_gender: "feminin", unit_price: 500, quantity: 5 }, true));
});