CREATE OR REPLACE FUNCTION public.monthly_client_ranking(p_year integer, p_month integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb; start_date date; end_date date;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Accès réservé au personnel'; END IF;
  IF p_year < 2000 OR p_year > 9998 OR p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'Mois ou année invalide'; END IF;
  start_date := make_date(p_year, p_month, 1); end_date := (start_date + interval '1 month')::date;
  WITH names AS (
    SELECT lower(btrim(name)) AS normalized_name, (array_agg(id))[1] AS client_id, count(*) AS matches
    FROM public.clients GROUP BY lower(btrim(name))
  ), paid AS (
    SELECT o.client_id, p.order_id, p.amount
    FROM public.payments p JOIN public.orders o ON o.id = p.order_id
    WHERE p.created_at >= (start_date::timestamp AT TIME ZONE 'Africa/Abidjan')
      AND p.created_at < (end_date::timestamp AT TIME ZONE 'Africa/Abidjan')
      AND p.context <> 'ancien' AND p.amount > 0
      AND (p.method <> 'especes' OR p.context <> 'livraison' OR p.cash_confirmed_at IS NOT NULL)
  ), journal AS (
    SELECT coalesce(o.client_id, CASE WHEN w.order_id IS NULL AND n.matches = 1 THEN n.client_id END) AS client_id, w.order_id, w.amount
    FROM public.withdrawals w LEFT JOIN public.orders o ON o.id = w.order_id
    LEFT JOIN names n ON n.normalized_name = lower(btrim(w.client_name))
    WHERE w.date >= start_date AND w.date < end_date AND w.amount > 0
      AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id = w.order_id AND p.context IN ('retrait', 'livraison'))
  ), receipts AS (
    SELECT * FROM paid UNION ALL SELECT * FROM journal
  ), totals AS (
    SELECT c.id AS client_id, c.name, c.phone, count(DISTINCT r.order_id) AS orders_count, sum(r.amount) AS total_spent
    FROM receipts r JOIN public.clients c ON c.id = r.client_id GROUP BY c.id, c.name, c.phone
  ), ranked AS (
    SELECT row_number() OVER (ORDER BY total_spent DESC, name ASC, client_id ASC) AS rank, * FROM totals
  )
  SELECT jsonb_build_object('rows', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.rank) FROM ranked r), '[]'::jsonb),
    'unassigned', coalesce((SELECT sum(amount) FROM journal WHERE client_id IS NULL), 0)) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.monthly_client_ranking(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.monthly_client_ranking(integer, integer) TO authenticated;
COMMENT ON FUNCTION public.monthly_client_ranking(integer, integer) IS 'Monthly collected client payments; partial payments only, no duplicate withdrawal backing payments, ambiguous manual client names excluded.';