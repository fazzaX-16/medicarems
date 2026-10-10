DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients','doctors','appointments','medicines','bills','equipment'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo full access" ON public.%I', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY "signed-in staff full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;