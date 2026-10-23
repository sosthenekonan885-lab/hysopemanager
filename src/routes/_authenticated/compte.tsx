import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Mon compte" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
