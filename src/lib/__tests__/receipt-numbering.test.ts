// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { orderNo } from "../format";

async function numberingDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE SEQUENCE public.order_number_seq START 1;
    CREATE TABLE public.orders (
      number bigint NOT NULL UNIQUE DEFAULT nextval('public.order_number_seq'),
      legacy boolean DEFAULT false, discount int DEFAULT 0, created_by uuid,
      status text DEFAULT 'en_cours', created_at timestamptz DEFAULT now()
    );
  `);
  const source = readFileSync("drizzle/migrations/0001_retraits_anciens_recus_casiers.sql", "utf8");
  const guard = source.match(/create or replace function public\.guard_order\(\)[\s\S]*?end \$\$;/)?.[0];
  if (!guard) throw new Error("Order guard missing from migration");
  await db.exec(guard);
  await db.exec(`CREATE TRIGGER trg_guard_order BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.guard_order();`);
  await db.exec(readFileSync("drizzle/migrations/0003_fix_receipt_number_double_increment.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0004_receipt_trigger_placeholder_default.sql", "utf8"));
  return db;
}

describe("numérotation des factures et reçus", () => {
  it("attribue 000001, 000002, 000003 sans consommer deux numéros par dépôt", async () => {
    const db = await numberingDatabase();
    try {
      const numbers: string[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await db.query<{ number: number }>("INSERT INTO public.orders DEFAULT VALUES RETURNING number");
        numbers.push(orderNo(result.rows[0]?.number));
      }
      expect(numbers).toEqual(["N°000001", "N°000002", "N°000003"]);
    } finally { await db.close(); }
  });

  it("conserve le reçu existant 000026 puis attribue 000027 et 000028", async () => {
    const db = await numberingDatabase();
    try {
      await db.exec("INSERT INTO public.orders(number, legacy) VALUES (26, true)");
      await db.exec("INSERT INTO public.orders DEFAULT VALUES; INSERT INTO public.orders DEFAULT VALUES;");
      const result = await db.query<{ number: number }>("SELECT number FROM public.orders ORDER BY number");
      expect(result.rows.map((row) => orderNo(row.number))).toEqual(["N°000026", "N°000027", "N°000028"]);
    } finally { await db.close(); }
  });
});