import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/hysope/ui";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Hysope Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Notifications" />
      <Empty>Module en cours de construction.</Empty>
    </div>
  ),
});
