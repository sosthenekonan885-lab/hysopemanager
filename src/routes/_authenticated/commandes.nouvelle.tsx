import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NewOrder } from "@/components/hysope/NewOrder";
export const Route = createFileRoute("/_authenticated/commandes/nouvelle")({
  validateSearch: z.object({ client: z.string().optional() }),
  head: () => ({ meta: [{ title: "Nouveau dépôt — Hysope Manager" }, { name: "description", content: "Créer un dépôt et un reçu au Pressing L’Hysope." }, { property: "og:title", content: "Nouveau dépôt — Hysope Manager" }, { property: "og:description", content: "Créer un dépôt et un reçu au Pressing L’Hysope." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewDeposit,
});
function NewDeposit() { const { client } = Route.useSearch(); return <NewOrder initialClient={client} />; }
