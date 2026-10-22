import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PayMethod = Database["public"]["Enums"]["pay_method"];

export const fcfa = (n: number | null | undefined) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0)).replace(/\u202f/g, " ")} F`;

export const orderNo = (n: number | null | undefined) => `N°${String(n ?? 0).padStart(6, "0")}`;

export const dateFr = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";
export const dateTimeFr = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  en_cours: "En cours de traitement",
  pret: "Prêt au retrait",
  retire: "Retiré",
  a_livrer: "À livrer",
  livre: "Livré",
  annule: "Annulée",
};

export const METHOD_LABEL: Record<PayMethod, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
};

export const paymentStatus = (finalTotal: number, paid: number) => {
  if (paid <= 0) return "Non payée";
  if (paid >= finalTotal) return "Payée";
  return "Avance versée";
};

export const LOCKERS = Array.from({ length: 32 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`);

export const COLORS = ["Blanc", "Noir", "Bleu", "Rouge", "Vert", "Jaune", "Gris", "Marron", "Rose", "Beige", "Orange", "Multicolore"];

export const COMPLAINT_TYPES = ["Vêtement manquant", "Tache", "Décoloration", "Déchirure", "Mauvaise finition", "Autre"];

/** Caisse théorique = fonds + espèces encaissées (hors livreur non remis) − dépenses espèces − sorties/microfinance + entrées */
export function theoreticalCash(input: {
  opening: number;
  cashPayments: number;
  cashExpenses: number;
  movements: { kind: string; amount: number }[];
}) {
  const mv = input.movements.reduce((s, m) => s + (m.kind === "entree" ? m.amount : -m.amount), 0);
  return input.opening + input.cashPayments - input.cashExpenses + mv;
}

export const isWeekend = (iso: string) => {
  const d = new Date(iso + "T12:00:00").getDay();
  return d === 0 || d === 6;
};
