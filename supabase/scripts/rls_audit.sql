-- =============================================================================
-- Pratiqo — RLS audit helpers
-- =============================================================================
--
-- Read-only queries to paste into Supabase Dashboard → SQL Editor when
-- responding to a "Table publicly accessible — rls_disabled_in_public"
-- warning from the Security Advisor, or any time you want to sanity-check
-- the live RLS state against what is encoded in supabase/migrations/.
--
-- These queries make no changes. They only inspect catalogs.
--
-- Run them in this order:
--   1. List every public table and whether RLS is enabled.
--   2. List every policy currently attached to every public table.
--   3. Spot the gap (RLS disabled, or RLS enabled with zero policies).
--
-- The companion migration `074_enable_rls_security_hardening.sql` is what
-- actually fixes any gap detected by query (1). Re-run query (1) after the
-- migration applies; the Security Advisor warning should clear on the next
-- automatic refresh.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS enable state for every public table
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Every policy currently attached to public.* tables
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tables in public with RLS DISABLED (the actual Security Advisor target)
--    Excludes extension-owned tables (PostGIS, etc.) so we do not flag
--    things we cannot safely lock down without breaking the extension.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND NOT EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_extension e ON e.oid = d.refobjid
    WHERE d.objid = c.oid
      AND d.deptype = 'e'
  )
ORDER BY c.relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Tables in public with RLS ENABLED but ZERO policies. These are not
--    visible to anon/authenticated (RLS+no-policy = deny by default), so
--    they don't trigger the Security Advisor — but they are usually a sign
--    that the app code is relying on the service-role key for everything,
--    or that a policy was accidentally dropped.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT schemaname, tablename, count(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
) p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND COALESCE(p.policy_count, 0) = 0
ORDER BY c.relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. View security mode (security_invoker on/off). Used by migration 075
--    to confirm `security_definer_view` warnings have cleared on
--    public.teachers_public, public.teacher_revenue, and public.revenue_daily.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  n.nspname  AS schema,
  c.relname  AS view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
ORDER BY c.relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Definitions of the three flagged views (so you can paste them back into
--    migration source-of-truth files if they were created via the Dashboard).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('teachers_public', 'teacher_revenue', 'revenue_daily')
ORDER BY viewname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Ownership / extension membership for spatial_ref_sys. If
--    `extension_name = 'postgis'`, the table is owned by the extension and
--    `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` fails with SQLSTATE 42501
--    (must be owner) — that is a known PostGIS limitation, not a Pratiqo
--    data leak (the table holds only public EPSG/SRID reference data).
--    Launch validation documents this as the sole allowlisted exception; do
--    not ship direct-fail migrations (see tests/security/postgisRlsException.ts).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  e.extname AS extension_name,
  pg_get_userbyid(c.relowner) AS owner,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_depend  d ON d.objid = c.oid
LEFT JOIN pg_extension e ON e.oid = d.refobjid
WHERE n.nspname = 'public'
  AND c.relname = 'spatial_ref_sys';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. spatial_ref_sys: did migration 076 manage to enable RLS on the live DB?
--    Use this query right after applying 076 to confirm the Security Advisor
--    finding has cleared. If `rowsecurity` is false, the migration hit the
--    insufficient_privilege fallback (PostGIS / supabase_admin ownership) and
--    the warning must be dismissed manually with a note about PostGIS.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'spatial_ref_sys';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. spatial_ref_sys policies: confirm that — if 076 succeeded — the only
--    policy attached is the SELECT-only one granted to anon/authenticated,
--    with no INSERT/UPDATE/DELETE and not granted TO PUBLIC.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'spatial_ref_sys';
