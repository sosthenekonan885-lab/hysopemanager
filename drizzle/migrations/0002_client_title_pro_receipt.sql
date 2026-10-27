ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS title text, ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS establishment_type text, ADD COLUMN IF NOT EXISTS contact_person text, ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'particulier', ADD COLUMN IF NOT EXISTS notes text;
UPDATE public.services SET name = 'Jogging' WHERE name = 'Legging';
UPDATE public.order_items SET designation = 'Jogging' WHERE designation = 'Legging';