-- Stripe Connect / Identity production diagnostics for Pratiqo.
--
-- READ ONLY.
-- Run manually in the Supabase SQL editor with an admin/operator account.
-- Do not paste results into public channels: teacher names and user ids are operational data.
-- This file intentionally contains SELECT statements only.
--
-- Goal:
-- - quantify Connect activation states
-- - identify stale syncs
-- - identify teachers that look charge/payout-enabled but fail current Pratiqo readiness
-- - identify Identity status drift
--
-- Important limitation:
-- The current schema stores Stripe requirements in one collapsed JSONB array:
-- public.teachers.stripe_connect_requirements_due.
-- It does not distinguish currently_due, past_due, eventually_due, or future_requirements.
-- Use the requirement-name frequency query below, then compare affected accounts in Stripe Dashboard.

-- 1. Aggregate teacher Stripe/Identity status.
WITH teacher_status AS (
  SELECT
    t.id AS teacher_id,
    t.user_id,
    NULLIF(t.name, '') AS teacher_name,
    COALESCE(NULLIF(UPPER(t.country_code), ''), NULLIF(UPPER(p.country_code), '')) AS effective_country_code,
    (t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '') AS has_stripe_account,
    COALESCE(t.stripe_connect_onboarding_complete, false) AS onboarding_complete,
    COALESCE(t.stripe_connect_charges_enabled, false) AS charges_enabled,
    COALESCE(t.stripe_connect_payouts_enabled, false) AS payouts_enabled,
    CASE
      WHEN jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
        THEN jsonb_array_length(t.stripe_connect_requirements_due)
      ELSE NULL
    END AS requirements_due_count,
    NULLIF(t.stripe_connect_disabled_reason, '') AS disabled_reason,
    t.stripe_connect_last_synced_at,
    COALESCE(t.identity_verified, false) AS identity_verified,
    COALESCE(t.stripe_identity_status, 'null') AS stripe_identity_status,
    COALESCE(t.identity_status, 'null') AS identity_status,
    COALESCE(t.is_public, false) AS is_public,
    COALESCE(t.is_demo, false) AS is_demo,
    t.deactivated_at,
    t.deleted_at
  FROM public.teachers t
  LEFT JOIN public.profiles p ON p.id = t.user_id
)
SELECT
  COUNT(*) AS teachers_total,
  COUNT(*) FILTER (WHERE NOT is_demo AND deactivated_at IS NULL AND deleted_at IS NULL) AS active_non_demo_teachers,
  COUNT(*) FILTER (WHERE has_stripe_account) AS with_stripe_account,
  COUNT(*) FILTER (WHERE onboarding_complete) AS onboarding_complete,
  COUNT(*) FILTER (WHERE charges_enabled) AS charges_enabled,
  COUNT(*) FILTER (WHERE payouts_enabled) AS payouts_enabled,
  COUNT(*) FILTER (WHERE COALESCE(requirements_due_count, 0) > 0) AS with_requirements_due,
  COUNT(*) FILTER (WHERE disabled_reason IS NOT NULL) AS with_disabled_reason,
  COUNT(*) FILTER (WHERE stripe_connect_last_synced_at IS NULL) AS null_connect_last_synced_at,
  COUNT(*) FILTER (WHERE stripe_connect_last_synced_at < now() - interval '24 hours') AS synced_more_than_24h_ago,
  COUNT(*) FILTER (WHERE identity_verified) AS identity_verified,
  COUNT(*) FILTER (WHERE effective_country_code IS NULL OR effective_country_code <> 'CA') AS blocked_or_unknown_payout_country,
  COUNT(*) FILTER (
    WHERE has_stripe_account
      AND onboarding_complete
      AND charges_enabled
      AND COALESCE(requirements_due_count, 0) = 0
      AND disabled_reason IS NULL
  ) AS current_pratiqo_payment_ready_count,
  COUNT(*) FILTER (
    WHERE has_stripe_account
      AND onboarding_complete
      AND payouts_enabled
      AND COALESCE(requirements_due_count, 0) = 0
      AND disabled_reason IS NULL
  ) AS current_pratiqo_payout_ready_count
FROM teacher_status;

-- 2. Stripe Identity status distribution.
SELECT
  COALESCE(stripe_identity_status, 'null') AS stripe_identity_status,
  COALESCE(identity_status, 'null') AS identity_status,
  COALESCE(identity_verified, false) AS identity_verified,
  COUNT(*) AS teacher_count
FROM public.teachers
GROUP BY 1, 2, 3
ORDER BY teacher_count DESC, stripe_identity_status, identity_status;

-- 3. Country support distribution for payout onboarding.
WITH teacher_country AS (
  SELECT
    COALESCE(NULLIF(UPPER(t.country_code), ''), NULLIF(UPPER(p.country_code), ''), 'null') AS effective_country_code,
    COALESCE(t.is_demo, false) AS is_demo,
    t.deactivated_at,
    t.deleted_at
  FROM public.teachers t
  LEFT JOIN public.profiles p ON p.id = t.user_id
)
SELECT
  effective_country_code,
  COUNT(*) AS teacher_count,
  COUNT(*) FILTER (WHERE effective_country_code = 'CA') AS payout_supported_under_current_launch_config,
  COUNT(*) FILTER (WHERE effective_country_code <> 'CA') AS payout_blocked_under_current_launch_config
FROM teacher_country
WHERE NOT is_demo
  AND deactivated_at IS NULL
  AND deleted_at IS NULL
GROUP BY effective_country_code
ORDER BY teacher_count DESC, effective_country_code;

-- 4. Teachers with a Stripe account but not payment-ready under current Pratiqo logic.
WITH teacher_status AS (
  SELECT
    t.id AS teacher_id,
    t.user_id,
    NULLIF(t.name, '') AS teacher_name,
    COALESCE(NULLIF(UPPER(t.country_code), ''), NULLIF(UPPER(p.country_code), '')) AS effective_country_code,
    (t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '') AS has_stripe_account,
    COALESCE(t.stripe_connect_onboarding_complete, false) AS onboarding_complete,
    COALESCE(t.stripe_connect_charges_enabled, false) AS charges_enabled,
    COALESCE(t.stripe_connect_payouts_enabled, false) AS payouts_enabled,
    CASE
      WHEN jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
        THEN jsonb_array_length(t.stripe_connect_requirements_due)
      ELSE NULL
    END AS requirements_due_count,
    NULLIF(t.stripe_connect_disabled_reason, '') AS disabled_reason,
    t.stripe_connect_last_synced_at,
    COALESCE(t.is_demo, false) AS is_demo,
    t.deactivated_at,
    t.deleted_at
  FROM public.teachers t
  LEFT JOIN public.profiles p ON p.id = t.user_id
)
SELECT
  teacher_id,
  user_id,
  teacher_name,
  effective_country_code,
  onboarding_complete,
  charges_enabled,
  payouts_enabled,
  requirements_due_count,
  disabled_reason,
  stripe_connect_last_synced_at,
  CASE
    WHEN NOT has_stripe_account THEN 'missing_stripe_account'
    WHEN NOT onboarding_complete THEN 'onboarding_incomplete'
    WHEN NOT charges_enabled THEN 'charges_disabled'
    WHEN COALESCE(requirements_due_count, 0) > 0 THEN 'requirements_due'
    WHEN disabled_reason IS NOT NULL THEN 'disabled_reason'
    ELSE 'unknown'
  END AS primary_payment_blocker
FROM teacher_status
WHERE NOT is_demo
  AND deactivated_at IS NULL
  AND deleted_at IS NULL
  AND has_stripe_account
  AND NOT (
    onboarding_complete
    AND charges_enabled
    AND COALESCE(requirements_due_count, 0) = 0
    AND disabled_reason IS NULL
  )
ORDER BY
  charges_enabled DESC,
  payouts_enabled DESC,
  requirements_due_count DESC NULLS LAST,
  stripe_connect_last_synced_at ASC NULLS FIRST;

-- 5. Teachers with charges_enabled = true but not payment-ready.
-- This is the most direct check for "Stripe says charges work, but Pratiqo says no".
WITH teacher_status AS (
  SELECT
    t.id AS teacher_id,
    t.user_id,
    NULLIF(t.name, '') AS teacher_name,
    COALESCE(t.stripe_connect_onboarding_complete, false) AS onboarding_complete,
    COALESCE(t.stripe_connect_charges_enabled, false) AS charges_enabled,
    CASE
      WHEN jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
        THEN jsonb_array_length(t.stripe_connect_requirements_due)
      ELSE NULL
    END AS requirements_due_count,
    t.stripe_connect_requirements_due,
    NULLIF(t.stripe_connect_disabled_reason, '') AS disabled_reason,
    t.stripe_connect_last_synced_at,
    COALESCE(t.is_demo, false) AS is_demo,
    t.deactivated_at,
    t.deleted_at
  FROM public.teachers t
)
SELECT
  teacher_id,
  user_id,
  teacher_name,
  onboarding_complete,
  charges_enabled,
  requirements_due_count,
  stripe_connect_requirements_due,
  disabled_reason,
  stripe_connect_last_synced_at
FROM teacher_status
WHERE NOT is_demo
  AND deactivated_at IS NULL
  AND deleted_at IS NULL
  AND charges_enabled = true
  AND NOT (
    onboarding_complete
    AND COALESCE(requirements_due_count, 0) = 0
    AND disabled_reason IS NULL
  )
ORDER BY requirements_due_count DESC NULLS LAST, stripe_connect_last_synced_at ASC NULLS FIRST;

-- 6. Teachers with payouts_enabled = true but not payout-ready.
WITH teacher_status AS (
  SELECT
    t.id AS teacher_id,
    t.user_id,
    NULLIF(t.name, '') AS teacher_name,
    COALESCE(t.stripe_connect_onboarding_complete, false) AS onboarding_complete,
    COALESCE(t.stripe_connect_payouts_enabled, false) AS payouts_enabled,
    CASE
      WHEN jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
        THEN jsonb_array_length(t.stripe_connect_requirements_due)
      ELSE NULL
    END AS requirements_due_count,
    t.stripe_connect_requirements_due,
    NULLIF(t.stripe_connect_disabled_reason, '') AS disabled_reason,
    t.stripe_connect_last_synced_at,
    COALESCE(t.is_demo, false) AS is_demo,
    t.deactivated_at,
    t.deleted_at
  FROM public.teachers t
)
SELECT
  teacher_id,
  user_id,
  teacher_name,
  onboarding_complete,
  payouts_enabled,
  requirements_due_count,
  stripe_connect_requirements_due,
  disabled_reason,
  stripe_connect_last_synced_at
FROM teacher_status
WHERE NOT is_demo
  AND deactivated_at IS NULL
  AND deleted_at IS NULL
  AND payouts_enabled = true
  AND NOT (
    onboarding_complete
    AND COALESCE(requirements_due_count, 0) = 0
    AND disabled_reason IS NULL
  )
ORDER BY requirements_due_count DESC NULLS LAST, stripe_connect_last_synced_at ASC NULLS FIRST;

-- 7. Stale or null Stripe Connect sync rows.
SELECT
  t.id AS teacher_id,
  t.user_id,
  NULLIF(t.name, '') AS teacher_name,
  COALESCE(NULLIF(UPPER(t.country_code), ''), NULLIF(UPPER(p.country_code), '')) AS effective_country_code,
  (t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '') AS has_stripe_account,
  t.stripe_connect_onboarding_complete,
  t.stripe_connect_charges_enabled,
  t.stripe_connect_payouts_enabled,
  t.stripe_connect_last_synced_at
FROM public.teachers t
LEFT JOIN public.profiles p ON p.id = t.user_id
WHERE COALESCE(t.is_demo, false) = false
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND (t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '')
  AND (
    t.stripe_connect_last_synced_at IS NULL
    OR t.stripe_connect_last_synced_at < now() - interval '24 hours'
  )
ORDER BY t.stripe_connect_last_synced_at ASC NULLS FIRST;
-- 8. Frequency of stored Connect requirement names.
-- Because the DB currently collapses current/eventual/future buckets, this is not enough
-- to decide whether the requirement is truly blocking. Compare affected accounts in Stripe.
SELECT
  requirement_name,
  COUNT(*) AS teacher_count
FROM public.teachers t
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
      THEN t.stripe_connect_requirements_due
    ELSE '[]'::jsonb
  END
) AS req(requirement_name)
WHERE COALESCE(t.is_demo, false) = false
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
GROUP BY requirement_name
ORDER BY teacher_count DESC, requirement_name;

-- 9. Identity/Connect mismatches worth inspecting manually.
SELECT
  t.id AS teacher_id,
  t.user_id,
  NULLIF(t.name, '') AS teacher_name,
  COALESCE(t.identity_verified, false) AS identity_verified,
  COALESCE(t.identity_status, 'null') AS identity_status,
  COALESCE(t.stripe_identity_status, 'null') AS stripe_identity_status,
  (t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '') AS has_stripe_account,
  COALESCE(t.stripe_connect_onboarding_complete, false) AS onboarding_complete,
  COALESCE(t.stripe_connect_charges_enabled, false) AS charges_enabled,
  COALESCE(t.stripe_connect_payouts_enabled, false) AS payouts_enabled,
  t.stripe_connect_last_synced_at
FROM public.teachers t
WHERE COALESCE(t.is_demo, false) = false
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND (
    (COALESCE(t.identity_verified, false) = true AND COALESCE(t.stripe_identity_status, '') <> 'verified')
    OR (COALESCE(t.stripe_identity_status, '') = 'verified' AND COALESCE(t.identity_verified, false) <> true)
    OR (COALESCE(t.identity_verified, false) = true AND (t.stripe_account_id IS NULL OR BTRIM(t.stripe_account_id) = ''))
    OR ((t.stripe_account_id IS NOT NULL AND BTRIM(t.stripe_account_id) <> '') AND COALESCE(t.identity_verified, false) <> true)
  )
ORDER BY identity_verified DESC, stripe_identity_status, has_stripe_account DESC;

-- 10. Rows where Pratiqo cannot distinguish only-eventual/future requirements.
-- If this returns rows, inspect each corresponding connected account in Stripe Dashboard.
SELECT
  t.id AS teacher_id,
  t.user_id,
  NULLIF(t.name, '') AS teacher_name,
  t.stripe_connect_charges_enabled,
  t.stripe_connect_payouts_enabled,
  t.stripe_connect_requirements_due,
  t.stripe_connect_last_synced_at,
  'DB stores collapsed requirements only; verify currently_due/past_due/eventually_due/future_requirements in Stripe Dashboard.' AS diagnostic_note
FROM public.teachers t
WHERE COALESCE(t.is_demo, false) = false
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND COALESCE(t.stripe_connect_charges_enabled, false) = true
  AND COALESCE(t.stripe_connect_payouts_enabled, false) = true
  AND jsonb_typeof(t.stripe_connect_requirements_due) = 'array'
  AND jsonb_array_length(t.stripe_connect_requirements_due) > 0
ORDER BY t.stripe_connect_last_synced_at ASC NULLS FIRST;
