import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Utilisateurs" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
