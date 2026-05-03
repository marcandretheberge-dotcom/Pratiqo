-- Adds Stripe Identity tracking columns to teachers.
-- Keeps existing identity_status / identity_verified for backward compat;
-- the webhook updates both sets of columns.
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS stripe_identity_session_id     text,
  ADD COLUMN IF NOT EXISTS stripe_identity_status         text,
  ADD COLUMN IF NOT EXISTS stripe_identity_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_identity_failed_reason  text;

-- Back-fill from existing data so the new card shows the right state.
UPDATE teachers
SET stripe_identity_status = CASE
  WHEN identity_verified = true     THEN 'verified'
  WHEN identity_status   = 'pending' THEN 'requires_input'
  WHEN identity_status   = 'failed'  THEN 'failed'
  ELSE NULL
END
WHERE identity_verified = true
   OR identity_status IN ('pending', 'failed');
