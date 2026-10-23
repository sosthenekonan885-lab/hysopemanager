import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Historique" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
