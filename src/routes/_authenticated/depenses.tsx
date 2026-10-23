import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Dépenses" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
