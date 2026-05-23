-- Historical guard for teachers_public.stripe_identity_status.
--
-- Originally this migration raised an EXCEPTION if teachers_public did not
-- expose stripe_identity_status. That was a production-drift safety net while
-- the public view still leaked Stripe Identity workflow internals.
--
-- Migration 070_teachers_public_read_isolation.sql intentionally REMOVES
-- stripe_identity_status (and other internal workflow fields) from the public
-- view as part of the D1 hardening. After 070 runs, the column is supposed to
-- be gone, so the original RAISE EXCEPTION here would block fresh dev DBs from
-- ever progressing past this migration to reach 070.
--
-- The guard is downgraded to RAISE NOTICE so it remains informative without
-- breaking the migration chain. Production systems that already passed this
-- guard strictly are unaffected (the relaxed check still passes); fresh dev
-- DBs can now apply 055 → 057 → 070 in order.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teachers_public'
      AND column_name = 'stripe_identity_status'
  ) THEN
    RAISE NOTICE
      'public.teachers_public no longer exposes stripe_identity_status. '
      'This is expected after migration 070_teachers_public_read_isolation '
      '(D1 hardening). If you reached this state by accident, rebuild '
      'teachers_public from the latest definition in migration 070.';
  END IF;
END $$;
