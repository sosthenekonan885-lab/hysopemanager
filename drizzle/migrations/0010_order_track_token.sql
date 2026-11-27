ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS track_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS orders_track_token_idx ON public.orders (track_token);