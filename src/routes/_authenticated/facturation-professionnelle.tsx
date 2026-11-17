import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NewOrder } from "@/components/hysope/NewOrder";
export const Route = createFileRoute("/_authenticated/facturation-professionnelle")({
  validateSearch: z.object({ client: z.string().optional() }),
  head: () => ({ meta: [{ title: "Facturation professionnelle — Hysope Manager" }, { name: "description", content: "Factures et reçus des résidences, hôtels et cliniques partenaires du Pressing L’Hysope." }, { property: "og:title", content: "Facturation professionnelle — Hysope Manager" }, { property: "og:description", content: "Facturation personnalisée des établissements partenaires du Pressing L’Hysope." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProfessionalBilling,
});
function ProfessionalBilling() { const { client } = Route.useSearch(); return <NewOrder initialClient={client} professional />; }
