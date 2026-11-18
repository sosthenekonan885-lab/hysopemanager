export type Grammar = { grammatical_gender?: string | null; singular_name?: string | null; plural_name?: string | null };

export const clientName = (name: string | null | undefined) => (name ?? "").toLocaleUpperCase("fr-FR");
export const RECEIPT_THANKS = "Merci de votre confiance et de votre fidélité. PRESSING L’HYSOPE prend soin de votre linge !";

// Only use a regular plural as a suggestion; saved grammatical forms remain authoritative.
export function suggestPlural(name: string) {
  return name.replace(/^(\S+)/, (word) => /[sxz]$/i.test(word) ? word : /eau$/i.test(word) ? `${word}x` : /al$/i.test(word) ? word.slice(0, -2) + "aux" : `${word}s`);
}

const COLOR_FORMS: Record<string, [string, string]> = {
  blanc: ["blanc", "blanche"], noir: ["noir", "noire"], bleu: ["bleu", "bleue"],
  vert: ["vert", "verte"], gris: ["gris", "grise"], violet: ["violet", "violette"],
  rouge: ["rouge", "rouge"], jaune: ["jaune", "jaune"], rose: ["rose", "rose"],
  beige: ["beige", "beige"], multicolore: ["multicolore", "multicolore"],
};
export function agreeColor(color: string, gender: string, plural: boolean) {
  const lower = color.toLocaleLowerCase("fr-FR").trim();
  // Compound shades and noun-derived orange/marron stay invariable.
  if (lower === "orange" || lower === "marron" || lower.includes(" ")) return lower;
  const forms = COLOR_FORMS[lower];
  if (!forms) return lower; // Never guess the agreement of an unconfigured color.
  const form = forms[gender === "feminin" ? 1 : 0];
  return plural && !form.endsWith("s") ? `${form}s` : form;
}
export function articleLabel(item: Grammar & { designation: string; quantity: number; colors: string[] }, withColors = true) {
  const plural = item.quantity > 1;
  const name = (plural ? item.plural_name : item.singular_name) || item.designation;
  const colors = item.colors.map((color) => item.grammatical_gender ? agreeColor(color, item.grammatical_gender, plural) : color);
  return `${name}${withColors && colors.length ? ` ${colors.join(", ")}` : ""}`;
}

export function defaultGrammar(name: string): Grammar {
  const first = name.toLocaleLowerCase("fr-FR").split(/[ (]/)[0] ?? "";
  const feminine = ["chemise", "robe", "jupe", "serviette", "couette", "housse", "taie", "nappe", "blouse", "tenue", "veste", "combinaison", "cravate"];
  const masculine = ["pantalon", "drap", "rideau", "peignoir", "champ", "jogging", "costume", "manteau", "pull", "short", "t-shirt", "boubou", "tapis"];
  if (![...feminine, ...masculine].includes(first)) return {};
  return { grammatical_gender: feminine.includes(first) ? "feminin" : "masculin", singular_name: name, plural_name: suggestPlural(name) };
}

export const PARTNER_TYPES = ["Résidence", "Hôtel", "Clinique"];
export const PARTNER_ARTICLES: Record<string, { name: string; plural: string; gender: string }[]> = {
  Résidence: [
    { name: "Drap", plural: "Draps", gender: "masculin" }, { name: "Taie d’oreiller", plural: "Taies d’oreiller", gender: "feminin" },
    { name: "Serviette", plural: "Serviettes", gender: "feminin" }, { name: "Couette", plural: "Couettes", gender: "feminin" },
    { name: "Housse de matelas", plural: "Housses de matelas", gender: "feminin" },
  ],
  Hôtel: [
    { name: "Drap", plural: "Draps", gender: "masculin" }, { name: "Nappe", plural: "Nappes", gender: "feminin" },
    { name: "Serviette de table", plural: "Serviettes de table", gender: "feminin" }, { name: "Rideau", plural: "Rideaux", gender: "masculin" },
    { name: "Peignoir", plural: "Peignoirs", gender: "masculin" },
  ],
  Clinique: [
    { name: "Blouse médicale", plural: "Blouses médicales", gender: "feminin" }, { name: "Drap hospitalier", plural: "Draps hospitaliers", gender: "masculin" },
    { name: "Tenue de travail", plural: "Tenues de travail", gender: "feminin" }, { name: "Champ opératoire", plural: "Champs opératoires", gender: "masculin" },
  ],
};