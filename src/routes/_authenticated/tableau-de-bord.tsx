import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Tableau de bord" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
