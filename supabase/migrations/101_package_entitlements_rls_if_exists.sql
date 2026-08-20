-- 101: Align package_entitlements RLS enable with the hardening IF EXISTS convention.
-- Migration 100 already enabled RLS; this statement is idempotent and satisfies
-- the explicit hardening audit pattern used by tests/security/rlsCoverage.test.ts.

ALTER TABLE IF EXISTS public.package_entitlements ENABLE ROW LEVEL SECURITY;
