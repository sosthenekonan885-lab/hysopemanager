import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Rapports" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
