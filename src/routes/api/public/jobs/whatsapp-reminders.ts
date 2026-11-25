import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { REMINDER_DAYS } from "@/lib/whatsapp-phone";

export const Route = createFileRoute("/api/public/jobs/whatsapp-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendOrderMessage, reconcileStatuses } = await import("@/lib/whatsapp.server");
        const limit = new Date(Date.now() - REMINDER_DAYS * 86400000).toISOString();
        const { data, error } = await supabaseAdmin.from("orders").select("id").eq("status", "pret").lte("ready_at", limit).limit(40);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        let sent = 0;
        for (const o of data ?? []) {
          try { const r = await sendOrderMessage(o.id, "rappel_7j"); if (r.ok && !("already" in r)) sent++; } catch (e) { console.error(e); }
        }
        await reconcileStatuses().catch(console.error);
        return Response.json({ checked: data?.length ?? 0, sent });
      },
    },
  },
});
