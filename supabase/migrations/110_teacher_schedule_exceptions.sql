-- =============================================================================
-- 110_teacher_schedule_exceptions.sql
--
-- Date-specific schedule exceptions (PR 17B).
-- exception_date is a local calendar date (same convention as bookings.slot_date).
-- One active exception per teacher per date: either full-day unavailable or
-- custom hours that override weekly intervals for that date only.
-- Private notes are teacher/admin only — never expose to learners.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  exception_type text NOT NULL,
  start_time time NULL,
  end_time time NULL,
  note text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_schedule_exceptions_type_check
    CHECK (exception_type IN ('unavailable_full_day', 'available_custom_hours')),
  CONSTRAINT teacher_schedule_exceptions_times_check
    CHECK (
      (
        exception_type = 'unavailable_full_day'
        AND start_time IS NULL
        AND end_time IS NULL
      )
      OR (
        exception_type = 'available_custom_hours'
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
        AND start_time < end_time
      )
    ),
  CONSTRAINT teacher_schedule_exceptions_note_len_check
    CHECK (note IS NULL OR char_length(note) <= 280)
);

COMMENT ON TABLE public.teacher_schedule_exceptions IS
  'PR 17B: teacher-controlled date exceptions. Local exception_date; no overnight custom hours.';

COMMENT ON COLUMN public.teacher_schedule_exceptions.note IS
  'Private teacher note; never expose to learners.';

CREATE UNIQUE INDEX IF NOT EXISTS teacher_schedule_exceptions_unique_active_date_idx
  ON public.teacher_schedule_exceptions (teacher_id, exception_date)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS teacher_schedule_exceptions_teacher_id_idx
  ON public.teacher_schedule_exceptions (teacher_id);

CREATE INDEX IF NOT EXISTS teacher_schedule_exceptions_teacher_date_idx
  ON public.teacher_schedule_exceptions (teacher_id, exception_date)
  WHERE is_active = true;

ALTER TABLE public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_schedule_exceptions_select_own" ON public.teacher_schedule_exceptions;
CREATE POLICY "teacher_schedule_exceptions_select_own"
  ON public.teacher_schedule_exceptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_schedule_exceptions.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_schedule_exceptions_insert_own" ON public.teacher_schedule_exceptions;
CREATE POLICY "teacher_schedule_exceptions_insert_own"
  ON public.teacher_schedule_exceptions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_schedule_exceptions.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_schedule_exceptions_update_own" ON public.teacher_schedule_exceptions;
CREATE POLICY "teacher_schedule_exceptions_update_own"
  ON public.teacher_schedule_exceptions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_schedule_exceptions.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_schedule_exceptions.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_schedule_exceptions_delete_own" ON public.teacher_schedule_exceptions;
CREATE POLICY "teacher_schedule_exceptions_delete_own"
  ON public.teacher_schedule_exceptions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_schedule_exceptions.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_schedule_exceptions TO authenticated;
GRANT ALL ON public.teacher_schedule_exceptions TO service_role;
