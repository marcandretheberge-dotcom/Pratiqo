-- =============================================================================
-- 108_teacher_weekly_availability_intervals.sql
--
-- Precise weekly availability intervals for teachers (PR 17A).
-- day_of_week uses JavaScript Date#getDay() convention: 0 = Sunday … 6 = Saturday.
-- Times are local wall-clock (same convention as slot_date / time_slot generation).
-- Overnight intervals (end <= start) are rejected.
--
-- Legacy teachers.availability jsonb (Matin/Après-midi/Soir) remains when the
-- feature flag is OFF. This table is the source of truth only when
-- ENABLE_TEACHER_SCHEDULE_INTERVALS=true on the server.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_weekly_availability_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_weekly_availability_intervals_dow_check
    CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT teacher_weekly_availability_intervals_time_order_check
    CHECK (start_time < end_time)
);

COMMENT ON TABLE public.teacher_weekly_availability_intervals IS
  'PR 17A: teacher-controlled weekly time intervals. day_of_week 0=Sunday (JS getDay). No overnight intervals.';

COMMENT ON COLUMN public.teacher_weekly_availability_intervals.day_of_week IS
  '0=Sunday, 1=Monday, …, 6=Saturday (matches Date#getDay / JS_DOW_TO_KEY).';

CREATE UNIQUE INDEX IF NOT EXISTS teacher_weekly_availability_intervals_unique_exact_idx
  ON public.teacher_weekly_availability_intervals (teacher_id, day_of_week, start_time, end_time);

CREATE INDEX IF NOT EXISTS teacher_weekly_availability_intervals_teacher_id_idx
  ON public.teacher_weekly_availability_intervals (teacher_id);

CREATE INDEX IF NOT EXISTS teacher_weekly_availability_intervals_teacher_day_idx
  ON public.teacher_weekly_availability_intervals (teacher_id, day_of_week)
  WHERE is_active = true;

ALTER TABLE public.teacher_weekly_availability_intervals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_weekly_intervals_select_own" ON public.teacher_weekly_availability_intervals;
CREATE POLICY "teacher_weekly_intervals_select_own"
  ON public.teacher_weekly_availability_intervals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_weekly_availability_intervals.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_weekly_intervals_insert_own" ON public.teacher_weekly_availability_intervals;
CREATE POLICY "teacher_weekly_intervals_insert_own"
  ON public.teacher_weekly_availability_intervals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_weekly_availability_intervals.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_weekly_intervals_update_own" ON public.teacher_weekly_availability_intervals;
CREATE POLICY "teacher_weekly_intervals_update_own"
  ON public.teacher_weekly_availability_intervals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_weekly_availability_intervals.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_weekly_availability_intervals.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_weekly_intervals_delete_own" ON public.teacher_weekly_availability_intervals;
CREATE POLICY "teacher_weekly_intervals_delete_own"
  ON public.teacher_weekly_availability_intervals FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_weekly_availability_intervals.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

-- Service role bypasses RLS; booking slot computation uses admin client.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_weekly_availability_intervals TO authenticated;
GRANT ALL ON public.teacher_weekly_availability_intervals TO service_role;
