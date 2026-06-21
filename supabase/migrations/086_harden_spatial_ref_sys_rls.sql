-- Harden PostGIS spatial reference catalog for Supabase Security Advisor.
--
-- public.spatial_ref_sys is extension-owned reference data (SRID definitions),
-- not Pratiqo user data. Because the public schema is exposed to PostgREST,
-- launch validation requires explicit RLS plus a read-only policy.
--
-- Migrations 075/076 attempted best-effort changes inside DO blocks that could
-- no-op with insufficient_privilege. This forward migration applies the
-- contract directly so production lint can verify the hardening.

ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spatial_ref_sys_select_public" ON public.spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys read" ON public.spatial_ref_sys;

CREATE POLICY "spatial_ref_sys read"
  ON public.spatial_ref_sys
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.spatial_ref_sys FROM anon, authenticated;
