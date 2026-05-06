-- Slot-based bookings + teacher blocked periods
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS time_slot text,
  ADD COLUMN IF NOT EXISTS slot_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_teacher_slot'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT unique_teacher_slot UNIQUE (teacher_id, slot_date, time_slot);
  END IF;
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  period text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_teacher_date ON public.blocked_slots (teacher_id, blocked_date);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_slots_select_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_select_teacher"
  ON public.blocked_slots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blocked_slots_insert_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_insert_teacher"
  ON public.blocked_slots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blocked_slots_delete_teacher" ON public.blocked_slots;
CREATE POLICY "blocked_slots_delete_teacher"
  ON public.blocked_slots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = blocked_slots.teacher_id AND t.user_id = auth.uid()
    )
  );
