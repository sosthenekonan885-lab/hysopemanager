ALTER TABLE public.withdrawals ADD COLUMN method public.pay_method;
COMMENT ON COLUMN public.withdrawals.method IS 'Payment method recorded at withdrawal. NULL preserves historical records whose method is unknown; the withdrawal form requires an explicit choice.';
UPDATE public.withdrawals w SET method = p.method FROM (SELECT order_id, (array_agg(DISTINCT method))[1] AS method, sum(amount) AS amount FROM public.payments WHERE context IN ('retrait','livraison') GROUP BY order_id HAVING count(DISTINCT method) = 1) p WHERE w.order_id = p.order_id AND w.amount = p.amount;
CREATE OR REPLACE FUNCTION public.log_withdrawal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cname text; amt int; methods public.pay_method[];
BEGIN
  IF new.status IN ('retire','livre') AND old.status NOT IN ('retire','livre') THEN
    SELECT name INTO cname FROM public.clients WHERE id = new.client_id;
    SELECT coalesce(sum(amount),0), array_agg(DISTINCT method) INTO amt, methods FROM public.payments WHERE order_id = new.id AND context IN ('retrait','livraison');
    INSERT INTO public.withdrawals(date, client_name, receipt_no, amount, order_id, method)
      VALUES (current_date, cname, new.number, amt, new.id, CASE WHEN cardinality(methods) = 1 THEN methods[1] ELSE NULL END)
      ON CONFLICT (receipt_no) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;