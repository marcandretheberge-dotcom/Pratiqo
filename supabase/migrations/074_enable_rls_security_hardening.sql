-- =============================================================================
-- 074_enable_rls_security_hardening.sql
--
-- Defense-in-depth pass to clear Supabase Security Advisor's
-- "rls_disabled_in_public" warning for every current AND future public table.
--
-- This migration is intentionally additive and idempotent:
--   * It does NOT redefine any existing policy. The precise policies from
--     001 / 050 / 053 / 064 / 065 / 070 / 073 are the source of truth and
--     are preserved verbatim.
--   * It re-runs `ENABLE ROW LEVEL SECURITY` on every known application
--     table (no-op when already enabled, fixes drift if not).
--   * It runs a drift-catcher DO block for any *ordinary* public table that
--     is not in the explicit list (still excluding extension-owned tables
--     such as PostGIS or pg_stat_statements).
--   * It runs a final assertion that raises an exception if any public
--     ordinary table is still RLS-disabled after the previous steps.
--
-- Audit queries (run these in Supabase Dashboard → SQL Editor before and
-- after applying this migration to confirm the warning clears):
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd,
--          qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--
-- A persistent copy of these audit queries lives in
-- supabase/scripts/rls_audit.sql.
--
-- IMPORTANT — what this migration does NOT do:
--   * It does not create `USING (true)` policies on sensitive tables.
--   * It does not create any service_role policy (service role bypasses RLS
--     by design; explicit policies for it are a footgun).
--   * It does not change GRANT/REVOKE on application tables; the existing
--     grants from prior migrations are intentional.
--   * It does not touch views (views inherit RLS from the underlying
--     tables when `security_invoker = true`; `teachers_public` already
--     uses that flag — see 050_security_hardening_rls.sql).
--   * It does not touch storage, auth, or any non-public schema.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1 — Explicit ENABLE on every known application table.
-- These statements are no-ops when RLS is already on (idempotent), and
-- self-heal any drift where a table was created in the Dashboard or in a
-- partial migration replay without RLS.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.assignments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_slots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_yopratiqo_learning_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credit_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_registrations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learner_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_disciplines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_private_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_cases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_credentials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_disciplines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yopratiqo_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — Drift catcher: enable RLS on any *ordinary* public table that is
-- not in the explicit list above (e.g. created later via Supabase Dashboard).
-- Extension-owned tables are excluded so we never break PostGIS, pgvector,
-- pg_stat_statements, etc. With RLS on and no explicit policy, the table
-- denies anon/authenticated by default — safer than the current state.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      c.oid::regclass AS qualified_name,
      c.relname       AS plain_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE 'sql_%'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )
  LOOP
    RAISE NOTICE '[074_rls_hardening] enabling RLS on drift table public.%', r.plain_name;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.qualified_name);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3 — Final assertion: fail the migration if any ordinary public table
-- is still RLS-disabled at the end. This makes the migration a regression
-- guard, not just a one-shot fix.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  leaked text[];
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
    INTO leaked
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      JOIN pg_extension e ON e.oid = d.refobjid
      WHERE d.objid = c.oid
        AND d.deptype = 'e'
    );

  IF leaked IS NOT NULL AND array_length(leaked, 1) > 0 THEN
    RAISE EXCEPTION
      '[074_rls_hardening] aborting: public tables still have RLS disabled: %',
      array_to_string(leaked, ', ');
  END IF;
END $$;

COMMENT ON SCHEMA public IS
  'Pratiqo application schema. RLS is mandatory on every ordinary table; '
  'see supabase/migrations/074_enable_rls_security_hardening.sql for the '
  'drift guard and supabase/scripts/rls_audit.sql for read-only audits.';
