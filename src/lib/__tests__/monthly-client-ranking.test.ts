import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(`
    CREATE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql AS 'select true';
    CREATE TABLE clients (id uuid PRIMARY KEY, name text, phone text);
    CREATE TABLE orders (id uuid PRIMARY KEY, client_id uuid);
    CREATE TABLE payments (order_id uuid, amount int, method text, context text, cash_confirmed_at timestamptz, created_at timestamptz);
    CREATE TABLE withdrawals (order_id uuid, client_name text, amount int, date date);
    INSERT INTO clients VALUES ('00000000-0000-0000-0000-00000000000a','Awa','0101'),('00000000-0000-0000-0000-00000000000b','Bakary','0202'),('00000000-0000-0000-0000-00000000000c','Chantal','0303');
    INSERT INTO orders VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000000c');
    -- Awa: avance partielle 3000 sur une facture plus grosse + 2000 retrait (adossé au journal)
    INSERT INTO payments VALUES ('00000000-0000-0000-0000-0000000000a1',3000,'wave','depot',NULL,'2026-10-05'),('00000000-0000-0000-0000-0000000000a2',2000,'especes','retrait',NULL,'2026-10-10');
    INSERT INTO withdrawals VALUES ('00000000-0000-0000-0000-0000000000a2','Awa',2000,'2026-10-10');
    -- Bakary: 4000 en octobre, 9000 en septembre (mois précédent)
    INSERT INTO payments VALUES ('00000000-0000-0000-0000-0000000000b1',4000,'especes','depot',NULL,'2026-10-12'),('00000000-0000-0000-0000-0000000000b1',9000,'especes','depot',NULL,'2026-09-12');
    -- Chantal: livraison espèces non confirmée et ancien paiement exclus, retrait manuel 1000 compté
    INSERT INTO payments VALUES ('00000000-0000-0000-0000-0000000000c1',7000,'especes','livraison',NULL,'2026-10-15'),('00000000-0000-0000-0000-0000000000c1',8000,'especes','ancien',NULL,'2026-10-15');
    INSERT INTO withdrawals VALUES (NULL,'chantal ',1000,'2026-10-20');
  `);
  await db.exec(readFileSync("drizzle/migrations/0007_monthly_client_ranking.sql", "utf8").replace(/^(REVOKE|GRANT).*$/gm, ""));
});
afterAll(() => db.close());

const rank = async (y: number, m: number) =>
  ((await db.query<{ r: { rows: { name: string; total_spent: number; orders_count: number; rank: number }[] } }>("SELECT monthly_client_ranking($1,$2) r", [y, m])).rows[0].r.rows)
    .map((x) => [x.rank, x.name, Number(x.total_spent), Number(x.orders_count)]);

it("classe octobre sur les seules sommes versées, sans double comptage", async () => {
  expect(await rank(2026, 10)).toEqual([[1, "Awa", 5000, 2], [2, "Bakary", 4000, 1], [3, "Chantal", 1000, 0]]);
});

it("consulte un mois précédent", async () => {
  expect(await rank(2026, 9)).toEqual([[1, "Bakary", 9000, 1]]);
});
