import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Retrouve la commande d'un reçu scanné (personnel connecté uniquement, RLS appliquée). */
export const findScannedOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().uuid().optional(), number: z.number().int().positive().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("orders").select("id").limit(1);
    if (data.token) q = q.eq("track_token", data.token);
    else if (data.number) q = q.eq("number", data.number).neq("number", 0);
    else return { id: null };
    const { data: r } = await q.maybeSingle();
    return { id: r?.id ?? null };
  });
