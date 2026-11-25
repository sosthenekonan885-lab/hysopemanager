import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deliveryId = request.headers.get("x-lovable-delivery");
        const event = request.headers.get("x-lovable-event");
        let payload: unknown;
        try {
          ({ payload } = await verifyWebhookRequest({ req: request, secret: process.env['WHATSAPP_API_KEY'] ?? '', maxBodyBytes: 4 * 1024 * 1024 }));
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!deliveryId || !event) return new Response("Missing headers", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("whatsapp_webhook_events")
          .upsert({ delivery_id: deliveryId, event, payload: payload as never }, { onConflict: "delivery_id", ignoreDuplicates: true });
        if (error) return new Response("Storage error", { status: 500 });
        const { data: row, error: readErr } = await supabaseAdmin.from("whatsapp_webhook_events").select("id,processed_at").eq("delivery_id", deliveryId).single();
        if (readErr) return new Response("Storage error", { status: 500 });
        if (row.processed_at) return new Response("ok");
        try {
          if (event === "whatsapp.status") {
            const { applyStatusEvent, reconcileStatuses } = await import("@/lib/whatsapp.server");
            await applyStatusEvent(row.id, payload);
            await reconcileStatuses().catch(console.error);
          } else {
            await supabaseAdmin.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
          }
        } catch (e) {
          await supabaseAdmin.from("whatsapp_webhook_events").update({ processing_error: String(e).slice(0, 500) }).eq("id", row.id);
          return new Response("Processing error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
