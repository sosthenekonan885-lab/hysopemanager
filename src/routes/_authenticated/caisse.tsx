import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({ meta: [{ title: "Caisse — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Caisse" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
