-- =============================================================================
-- 112_teacher_schedule_mode.sql
--
-- Per-teacher schedule source of truth for booking eligibility (PR 17A-CORE).
-- Defaults to legacy_blocks so existing Matin / Après-midi / Soir behavior
-- is unchanged until the teacher explicitly activates precise intervals.
--
-- Does NOT rebuild teachers_public / SEO projections — schedule_mode is
-- teacher-facing + booking-server only (not a public search signal).
-- =============================================================================

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'legacy_blocks';

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS precise_schedule_activated_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teachers_schedule_mode_check'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_schedule_mode_check
      CHECK (schedule_mode IN ('legacy_blocks', 'precise_intervals'));
  END IF;
END $$;

COMMENT ON COLUMN public.teachers.schedule_mode IS
  'Booking availability source: legacy_blocks = Matin/Après-midi/Soir; precise_intervals = weekly interval rows. Independent of is_public and Stripe readiness.';

COMMENT ON COLUMN public.teachers.precise_schedule_activated_at IS
  'When the teacher last activated precise_intervals mode. Null if never activated.';
