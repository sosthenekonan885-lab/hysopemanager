import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("préserve les anciens retraits et enregistre les trois modes", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TYPE public.pay_method AS ENUM ('especes','wave','orange_money'); CREATE TABLE withdrawals (id serial, receipt_no bigint UNIQUE, amount int, order_id uuid); CREATE TABLE payments (order_id uuid, amount int, method public.pay_method, context text); INSERT INTO withdrawals(receipt_no,amount) VALUES (27,4500);");
    await db.exec(readFileSync("drizzle/migrations/0006_withdrawal_payment_method.sql", "utf8"));
    await db.exec("INSERT INTO withdrawals(receipt_no,amount,method) VALUES (NULL,1000,'especes'),(NULL,2000,'wave'),(NULL,3000,'orange_money');");
    expect((await db.query("SELECT receipt_no,amount,method FROM withdrawals ORDER BY id")).rows).toEqual([
      { receipt_no: 27, amount: 4500, method: null },
      { receipt_no: null, amount: 1000, method: "especes" },
      { receipt_no: null, amount: 2000, method: "wave" },
      { receipt_no: null, amount: 3000, method: "orange_money" },
    ]);
  } finally { await db.close(); }
});