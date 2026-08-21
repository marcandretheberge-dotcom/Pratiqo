-- Forward RLS hardening for PR 17A weekly intervals table.
-- Idempotent ENABLE so rlsCoverage explicit-list stays in sync.

ALTER TABLE IF EXISTS public.teacher_weekly_availability_intervals ENABLE ROW LEVEL SECURITY;
