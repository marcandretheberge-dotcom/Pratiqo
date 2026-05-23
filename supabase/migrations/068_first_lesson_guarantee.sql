-- First lesson satisfaction guarantee v1.
--
-- Adds a single-use stamp on the profiles row so the same student cannot file
-- multiple first-lesson-guarantee claims. The actual claim is filed via a
-- support_cases row (category = refund_request, payout_hold = true) for
-- manual review by Pratiqo. No Stripe / booking_payments / refund enum is
-- touched by this migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_lesson_guarantee_used_at timestamptz;

COMMENT ON COLUMN public.profiles.first_lesson_guarantee_used_at IS
  'Stamped by the first-lesson guarantee claim API to enforce one-use-per-student. NULL means the student has not yet filed a claim.';
