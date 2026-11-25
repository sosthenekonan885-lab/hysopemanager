import { waPhone } from "./whatsapp-phone";
import { orderNo, fcfa } from "./format";
import { clientName } from "./article-language";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";
const TEMPLATE = { pret: "commande_prete", rappel_7j: "rappel_retrait" } as const;
export type WaKind = keyof typeof TEMPLATE;
const RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Envoie une seule fois un message WhatsApp pour une commande. */
export async function sendOrderMessage(orderId: string, kind: WaKind) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
  if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) throw new Error("WhatsApp n'est pas configuré");
  const db = await admin();
  const { data: o, error } = await db.from("order_summary").select("id,number,client_name,client_phone,balance").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!o) return { ok: false, reason: "commande introuvable" };
  const to = waPhone(o.client_phone);
  if (!to) return { ok: false, reason: "numéro invalide" };
  const { data: existing } = await db.from("whatsapp_messages").select("id").eq("order_id", orderId).eq("kind", kind).neq("status", "failed").maybeSingle();
  if (existing) return { ok: true, already: true };

  const res = await fetch(`${GATEWAY_URL}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": WHATSAPP_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to, type: "template",
      template: { name: TEMPLATE[kind], language: { code: "fr" }, components: [{ type: "body", parameters: [
        { type: "text", text: clientName(o.client_name) || "cher client" },
        { type: "text", text: orderNo(o.number).replace("N°", "") },
        { type: "text", text: fcfa(o.balance ?? 0) },
      ] }] },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`WhatsApp send failed [${res.status}]: ${text}`);
    await db.from("whatsapp_messages").insert({ order_id: orderId, kind, to_phone: to, status: "failed", error: `${res.status}: ${text}`.slice(0, 1000) });
    return { ok: false, reason: `WhatsApp a refusé l'envoi (${res.status})` };
  }
  const providerId = (JSON.parse(text) as { messages?: { id: string }[] }).messages?.[0]?.id ?? null;
  const { error: insErr } = await db.from("whatsapp_messages").insert({ order_id: orderId, kind, to_phone: to, provider_id: providerId, status: "accepted" });
  if (insErr) throw insErr;
  if (providerId) await reconcileStatuses(providerId);
  return { ok: true };
}

type WaStatus = { id: string; status: string; timestamp?: string; errors?: { title?: string; message?: string }[] };

/** Applique les accusés stockés à un message envoyé (dans les deux ordres d'arrivée). */
export async function reconcileStatuses(providerId?: string) {
  const db = await admin();
  let q = db.from("whatsapp_webhook_events").select("id,payload").eq("event", "whatsapp.status").is("processed_at", null).order("received_at").limit(50);
  if (providerId) q = q.contains("payload", { entry: [{ changes: [{ value: { statuses: [{ id: providerId }] } }] }] });
  const { data, error } = await q;
  if (error) throw error;
  for (const ev of data ?? []) await applyStatusEvent(ev.id, ev.payload);
}

export async function applyStatusEvent(eventId: string, payload: unknown) {
  const db = await admin();
  const statuses = ((payload as { entry?: { changes?: { value?: { statuses?: WaStatus[] } }[] }[] }).entry?.[0]?.changes?.[0]?.value?.statuses) ?? [];
  let pending = false;
  for (const s of statuses) {
    const { data: m, error } = await db.from("whatsapp_messages").select("id,status").eq("provider_id", s.id).maybeSingle();
    if (error) throw error;
    if (!m) { pending = true; continue; }
    if ((RANK[s.status] ?? 0) < (RANK[m.status] ?? 0)) continue;
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null;
    const err = s.errors?.map((e) => e.message ?? e.title).join(" ; ") || null;
    const { error: upErr } = await db.from("whatsapp_messages").update({ status: s.status, status_at: at, ...(err ? { error: err } : {}) }).eq("id", m.id);
    if (upErr) throw upErr;
  }
  if (!pending) {
    const { error } = await db.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", eventId);
    if (error) throw error;
  }
}
