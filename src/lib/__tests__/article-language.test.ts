import { describe, expect, it } from "vitest";
import { articleLabel, clientName, agreeColor } from "../article-language";

describe("désignations des articles", () => {
  it.each([
    ["Chemise", "Chemises", "feminin", 1, "Blanc", "Chemise blanche"],
    ["Chemise", "Chemises", "feminin", 3, "Blanc", "Chemises blanches"],
    ["Pantalon", "Pantalons", "masculin", 2, "Noir", "Pantalons noirs"],
    ["Jupe", "Jupes", "feminin", 1, "Bleu", "Jupe bleue"],
    ["Drap", "Draps", "masculin", 1, "Blanc", "Drap blanc"],
    ["Serviette", "Serviettes", "feminin", 5, "Blanc", "Serviettes blanches"],
    ["Rideau", "Rideaux", "masculin", 2, "Noir", "Rideaux noirs"],
  ])("accorde %s pour %s", (singular, plural, gender, quantity, color, expected) => {
    expect(articleLabel({ designation: singular, singular_name: singular, plural_name: plural, grammatical_gender: gender, quantity, colors: [color] })).toBe(expected);
  });
  it("conserve les accents des noms en majuscules", () => {
    expect(clientName("Kanga Affoué Anick")).toBe("KANGA AFFOUÉ ANICK");
  });
  it("préserve les couleurs invariables", () => {
    expect(agreeColor("Orange", "feminin", true)).toBe("orange");
    expect(agreeColor("Marron", "feminin", true)).toBe("marron");
  });
  it("ne réécrit pas les désignations historiques sans métadonnées", () => {
    expect(articleLabel({ designation: "Article spécial", quantity: 3, colors: ["Blanc"] })).toBe("Article spécial Blanc");
  });
});