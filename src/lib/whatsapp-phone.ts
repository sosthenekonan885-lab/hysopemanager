/** Convertit un numéro ivoirien (10 chiffres) au format international sans « + ». */
export function waPhone(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10) d = `225${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
export const REMINDER_DAYS = 7;
