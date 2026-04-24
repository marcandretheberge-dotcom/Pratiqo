-- Group classes (cours de groupe)
CREATE TABLE IF NOT EXISTS public.group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discipline text NOT NULL,
  max_participants integer NOT NULL DEFAULT 10,
  min_participants integer NOT NULL DEFAULT 2,
  current_participants integer NOT NULL DEFAULT 0,
  price_per_person numeric NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  online_link text,
  teaching_mode text NOT NULL DEFAULT 'person',
  is_recurring boolean DEFAULT false,
  recurrence text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.group_sessions (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed',
  stripe_payment_intent_id text,
  price_paid numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_teacher ON public.group_sessions (teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_status ON public.group_sessions (status, date);
CREATE INDEX IF NOT EXISTS idx_group_registrations_student ON public.group_registrations (student_id);
CREATE INDEX IF NOT EXISTS idx_group_registrations_session ON public.group_registrations (session_id);

ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read open sessions" ON public.group_sessions;
CREATE POLICY "Anyone can read open sessions"
  ON public.group_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Teachers insert own group sessions" ON public.group_sessions;
CREATE POLICY "Teachers insert own group sessions"
  ON public.group_sessions FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers update own group sessions" ON public.group_sessions;
CREATE POLICY "Teachers update own group sessions"
  ON public.group_sessions FOR UPDATE TO authenticated
  USING (
    teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers delete own group sessions" ON public.group_sessions;
CREATE POLICY "Teachers delete own group sessions"
  ON public.group_sessions FOR DELETE TO authenticated
  USING (
    teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students read own group registrations" ON public.group_registrations;
CREATE POLICY "Students read own group registrations"
  ON public.group_registrations FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students insert own group registrations" ON public.group_registrations;
CREATE POLICY "Students insert own group registrations"
  ON public.group_registrations FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students update own group registrations" ON public.group_registrations;
CREATE POLICY "Students update own group registrations"
  ON public.group_registrations FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers read registrations for their sessions" ON public.group_registrations;
CREATE POLICY "Teachers read registrations for their sessions"
  ON public.group_registrations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_sessions gs
      WHERE gs.id = group_registrations.session_id
        AND gs.teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
    )
  );
