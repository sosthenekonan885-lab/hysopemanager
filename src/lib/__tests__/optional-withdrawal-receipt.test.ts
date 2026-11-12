import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("accepte plusieurs retraits sans numéro tout en préservant les reçus existants", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE public.withdrawals (receipt_no bigint NOT NULL UNIQUE); INSERT INTO public.withdrawals VALUES (27);");
    await db.exec(readFileSync("drizzle/migrations/0005_optional_withdrawal_receipt.sql", "utf8"));
    await db.exec("INSERT INTO public.withdrawals VALUES (NULL), (NULL);");
    const result = await db.query("SELECT receipt_no FROM public.withdrawals ORDER BY receipt_no NULLS LAST");
    expect(result.rows).toEqual([{ receipt_no: 27 }, { receipt_no: null }, { receipt_no: null }]);
  } finally {
    await db.close();
  }
});