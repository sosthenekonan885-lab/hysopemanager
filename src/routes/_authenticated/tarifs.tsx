import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/tarifs")({
  head: () => ({ meta: [{ title: "Tarifs — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Tarifs" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
