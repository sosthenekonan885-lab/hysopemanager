// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("conserve les données existantes et enregistre les articles et tarifs par établissement", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE TABLE public.clients(id uuid PRIMARY KEY, name text);
      CREATE TABLE public.services(id uuid PRIMARY KEY, name text, price integer);
      CREATE TABLE public.order_items(id uuid PRIMARY KEY, designation text, quantity integer, unit_price integer);
      INSERT INTO public.clients VALUES ('00000000-0000-0000-0000-000000000001','Client existant');
      INSERT INTO public.order_items VALUES ('00000000-0000-0000-0000-000000000002','Chemise',2,500);`);
    await db.exec(readFileSync("drizzle/migrations/0008_partner_billing_article_grammar.sql", "utf8"));
    const old = await db.query("SELECT designation,quantity,unit_price,grammatical_gender FROM public.order_items");
    expect(old.rows).toEqual([{ designation: "Chemise", quantity: 2, unit_price: 500, grammatical_gender: null }]);
    await db.exec(`INSERT INTO public.clients VALUES ('00000000-0000-0000-0000-000000000003','Kanga Affoué Anick');
      INSERT INTO public.partner_prices(client_id,designation,grammatical_gender,singular_name,plural_name,unit_price)
      VALUES ('00000000-0000-0000-0000-000000000001','Serviette','feminin','Serviette','Serviettes',500);
      INSERT INTO public.custom_articles(name,grammatical_gender,singular_name,plural_name,unit_price)
      VALUES ('Rideau','masculin','Rideau','Rideaux',1200);`);
    expect((await db.query("SELECT name FROM public.clients ORDER BY id")).rows).toEqual([{ name: "Client existant" }, { name: "KANGA AFFOUÉ ANICK" }]);
    expect((await db.query("SELECT unit_price,plural_name FROM public.partner_prices")).rows).toEqual([{ unit_price: 500, plural_name: "Serviettes" }]);
    expect((await db.query("SELECT unit_price,plural_name FROM public.custom_articles")).rows).toEqual([{ unit_price: 1200, plural_name: "Rideaux" }]);
    expect((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('partner_prices','custom_articles')")).rows).toEqual([{ relrowsecurity: true }, { relrowsecurity: true }]);
  } finally { await db.close(); }
});