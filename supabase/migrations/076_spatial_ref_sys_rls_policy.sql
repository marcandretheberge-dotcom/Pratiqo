-- =============================================================================
-- 076_spatial_ref_sys_rls_policy.sql
--
-- Final attempt to clear the Supabase Security Advisor finding:
--   rls_disabled_in_public  →  public.spatial_ref_sys
--
-- Background
-- ----------
-- public.spatial_ref_sys is the PostGIS reference catalog. It maps SRID
-- integers to EPSG coordinate-system definitions (WGS84, NAD83, …). It is
-- not Pratiqo user data. PostGIS / supabase_admin typically owns the table
-- because it was created by the `postgis` extension, which means ordinary
-- migration roles may receive insufficient_privilege when trying to
-- ALTER it or attach a policy.
--
-- Migration 075 attempted a best-effort `ALTER TABLE … ENABLE ROW LEVEL
-- SECURITY` inside a DO block with an insufficient_privilege fallback.
-- 076 goes one step further: when ENABLE succeeds, it ALSO attaches a
-- SELECT-only policy so the data stays readable to PostgREST clients
-- (which is what the PostGIS spatial query helpers depend on). If the
-- caller lacks privilege to alter the extension-owned table, the whole
-- block degrades gracefully to a NOTICE and the migration still applies
-- successfully.
--
-- Hard constraints (locked in by tests/security/securityAdvisorFindings.test.ts):
--   * SELECT-only policy. No INSERT/UPDATE/DELETE policy is created.
--   * Granted to `anon, authenticated` (web roles). NOT `TO PUBLIC`.
--   * Idempotent: re-running this migration is a no-op (DROP POLICY IF
--     EXISTS + CREATE POLICY, caught by duplicate_object as a defence).
--   * No DROP / CREATE EXTENSION postgis.
--   * No ALTER EXTENSION postgis SET SCHEMA.
--   * No additional GRANT/REVOKE — column access on the table is already
--     governed by the PostGIS extension's own default grants.
--
-- Audit queries (run before/after in Supabase Dashboard → SQL Editor):
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys';
--
--   SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys';
--
-- A persistent copy of these audit queries lives in
-- supabase/scripts/rls_audit.sql.
-- =============================================================================

DO $$
BEGIN
  BEGIN
    ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "spatial_ref_sys_select_public" ON public.spatial_ref_sys;

    CREATE POLICY "spatial_ref_sys_select_public"
      ON public.spatial_ref_sys
      FOR SELECT
      TO anon, authenticated
      USING (true);

    RAISE NOTICE '[076_security] enabled RLS and SELECT-only policy on public.spatial_ref_sys';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[076_security] could not modify public.spatial_ref_sys due to insufficient privileges; likely PostGIS / supabase_admin owned. Safe to dismiss the rls_disabled_in_public advisor finding manually if confirmed as PostGIS reference data only.';
    WHEN undefined_table THEN
      RAISE NOTICE '[076_security] public.spatial_ref_sys does not exist on this database';
    WHEN duplicate_object THEN
      RAISE NOTICE '[076_security] spatial_ref_sys_select_public policy already exists; nothing to do';
  END;
END $$;
