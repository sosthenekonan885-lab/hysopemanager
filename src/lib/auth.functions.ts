import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@hysope.local`;

const MAX_ATTEMPTS = 5;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function anonClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function log(action: string, userId: string | null, data: Record<string, unknown>) {
  const db = await admin();
  await db.from("audit_log").insert({ table_name: "auth", action, user_id: userId, new_data: data as never });
}

export const needsSetup = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true });
  return { needsSetup: (count ?? 0) === 0 };
});

const userInput = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  full_name: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(72),
});

async function createAccount(input: z.infer<typeof userInput>, role: "admin" | "gerante") {
  const db = await admin();
  const { data: agency } = await db.from("agencies").select("id").limit(1).single();
  const { data, error } = await db.auth.admin.createUser({
    email: usernameToEmail(input.username),
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message.includes("already") ? "Identifiant déjà utilisé" : error?.message ?? "Erreur");
  const uid = data.user.id;
  const { error: pe } = await db.from("profiles").insert({
    id: uid, username: input.username.toLowerCase(), full_name: input.full_name, agency_id: agency?.id,
  });
  if (pe) { await db.auth.admin.deleteUser(uid); throw new Error("Identifiant déjà utilisé"); }
  await db.from("user_roles").insert({ user_id: uid, role });
  return uid;
}

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => userInput.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("La configuration initiale est déjà faite.");
    const uid = await createAccount(data, "admin");
    await log("creation_utilisateur", uid, { username: data.username, role: "admin" });
    return { ok: true };
  });

export const loginWithUsername = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(40), password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const username = data.username.trim().toLowerCase();
    const { data: profile } = await db.from("profiles").select("*").eq("username", username).maybeSingle();
    if (!profile) return { error: "Identifiant ou mot de passe incorrect." };
    if (!profile.active) return { error: "Ce compte est désactivé. Contactez un administrateur." };
    if (profile.locked) return { error: "Compte bloqué après 5 tentatives. Un administrateur doit le débloquer." };

    const { data: auth, error } = await anonClient().auth.signInWithPassword({
      email: usernameToEmail(username), password: data.password,
    });
    if (error || !auth.session) {
      const attempts = profile.failed_attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await db.from("profiles").update({ failed_attempts: attempts, locked }).eq("id", profile.id);
      await log("echec_connexion", profile.id, { attempts });
      if (locked) {
        await log("blocage", profile.id, {});
        await db.from("notifications").insert({ type: "securite", title: "Compte bloqué", body: `Le compte « ${profile.username} » a été bloqué après 5 tentatives.` });
        return { error: "Compte bloqué après 5 tentatives. Un administrateur doit le débloquer." };
      }
      return { error: `Mot de passe incorrect (${MAX_ATTEMPTS - attempts} essai(s) restant(s)).` };
    }
    await db.from("profiles").update({ failed_attempts: 0 }).eq("id", profile.id);
    await log("connexion", profile.id, {});
    return { access_token: auth.session.access_token, refresh_token: auth.session.refresh_token };
  });

export const logLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await log("deconnexion", context.userId, {});
    return { ok: true };
  });

async function assertAdmin(supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: boolean | null }> }) {
  const { data } = await supabase.rpc("is_admin");
  if (!data) throw new Error("Action réservée aux administrateurs");
}

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => userInput.extend({ role: z.enum(["admin", "gerante"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const uid = await createAccount(data, data.role);
    await log("creation_utilisateur", context.userId, { target: uid, username: data.username, role: data.role });
    return { ok: true };
  });

export const manageUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      action: z.enum(["unlock", "deactivate", "activate", "reset_password"]),
      password: z.string().min(6).max(72).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const db = await admin();
    if (data.userId === context.userId && data.action === "deactivate") throw new Error("Vous ne pouvez pas vous désactiver vous-même.");
    if (data.action === "unlock") await db.from("profiles").update({ locked: false, failed_attempts: 0 }).eq("id", data.userId);
    if (data.action === "deactivate") await db.from("profiles").update({ active: false }).eq("id", data.userId);
    if (data.action === "activate") await db.from("profiles").update({ active: true }).eq("id", data.userId);
    if (data.action === "reset_password") {
      if (!data.password) throw new Error("Nouveau mot de passe requis");
      const { error } = await db.auth.admin.updateUserById(data.userId, { password: data.password });
      if (error) throw new Error(error.message);
      await db.from("profiles").update({ locked: false, failed_attempts: 0 }).eq("id", data.userId);
    }
    await log(data.action === "reset_password" ? "reinitialisation_mdp" : `utilisateur_${data.action}`, context.userId, { target: data.userId });
    return { ok: true };
  });

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ current: z.string().min(1), next: z.string().min(6).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: p } = await db.from("profiles").select("username").eq("id", context.userId).single();
    const { error } = await anonClient().auth.signInWithPassword({ email: usernameToEmail(p!.username), password: data.current });
    if (error) throw new Error("Mot de passe actuel incorrect");
    const { error: ue } = await db.auth.admin.updateUserById(context.userId, { password: data.next });
    if (ue) throw new Error(ue.message);
    await log("changement_mdp", context.userId, {});
    return { ok: true };
  });

/** Espace client public : suivi d'une commande avec numéro + téléphone. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ number: z.coerce.number().int().positive(), phone: z.string().trim().min(6).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: o } = await db.from("order_summary").select("number,status,pickup_date,final_total,paid,balance,client_phone,delivery_mode,created_at").eq("number", data.number).maybeSingle();
    const digits = (s: string | null) => (s ?? "").replace(/\D/g, "").slice(-8);
    if (!o || digits(o.client_phone) !== digits(data.phone)) return { found: false as const };
    return {
      found: true as const,
      order: { number: o.number!, status: o.status!, pickup_date: o.pickup_date, final_total: o.final_total!, paid: o.paid!, balance: o.balance!, delivery_mode: o.delivery_mode!, created_at: o.created_at! },
    };
  });
