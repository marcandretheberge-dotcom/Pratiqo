-- Non-destructive guard for teachers_public.stripe_identity_status.
--
-- Production already exposes stripe_identity_status (and other columns such as
-- public_plan_tier). Do NOT CREATE OR REPLACE this view from an older column
-- list: PostgreSQL rejects shrinking the view (ERROR 42P16: cannot drop columns
-- from view) and a partial definition would drop columns from dependents.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teachers_public'
      AND column_name = 'stripe_identity_status'
  ) THEN
    RAISE EXCEPTION
      'public.teachers_public is missing column stripe_identity_status. '
      'Do not apply a partial CREATE OR REPLACE VIEW. Rebuild teachers_public '
      'from the latest full definition that preserves every current column '
      '(e.g. public_plan_tier) and omits private Stripe Identity fields '
      '(stripe_identity_session_id, stripe_identity_verified_at, '
      'stripe_identity_failed_reason). Use DROP VIEW only when you can '
      'recreate the complete view in the same migration.';
  END IF;
END $$;
