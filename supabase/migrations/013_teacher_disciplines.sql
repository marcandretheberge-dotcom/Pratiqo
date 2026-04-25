CREATE TABLE IF NOT EXISTS public.teacher_disciplines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  discipline_id text NOT NULL,
  specialite text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, discipline_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_disciplines ON public.teacher_disciplines (teacher_id);

ALTER TABLE public.teacher_disciplines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_disciplines_select_public" ON public.teacher_disciplines;
CREATE POLICY "teacher_disciplines_select_public"
  ON public.teacher_disciplines FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "teacher_disciplines_insert_own" ON public.teacher_disciplines;
CREATE POLICY "teacher_disciplines_insert_own"
  ON public.teacher_disciplines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_disciplines.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_disciplines_update_own" ON public.teacher_disciplines;
CREATE POLICY "teacher_disciplines_update_own"
  ON public.teacher_disciplines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_disciplines.teacher_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_disciplines.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_disciplines_delete_own" ON public.teacher_disciplines;
CREATE POLICY "teacher_disciplines_delete_own"
  ON public.teacher_disciplines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_disciplines.teacher_id AND t.user_id = auth.uid()
    )
  );
