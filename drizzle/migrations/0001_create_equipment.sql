CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_id text NOT NULL UNIQUE,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  purchase_date date NOT NULL,
  warranty_expiry date,
  last_maintenance date,
  next_maintenance date,
  renewal_due date,
  renewal_cost numeric NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'Good',
  status text NOT NULL DEFAULT 'Operational',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO anon, authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo full access" ON public.equipment FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);