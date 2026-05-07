-- Phase 1 learning context: account owners can manage one or more learner
-- profiles, and bookings can reference the learner receiving the lesson.

CREATE TABLE IF NOT EXISTS public.learner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  relationship text NOT NULL DEFAULT 'self',
  birth_year integer,
  grade_level text,
  school_level text,
  academic_program text,
  primary_language text,
  learning_goals text[] NOT NULL DEFAULT ARRAY[]::text[],
  subject_struggles text[] NOT NULL DEFAULT ARRAY[]::text[],
  current_grade_percent numeric,
  exam_date date,
  notes_for_teacher text,
  explanation_preference text,
  is_default boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT learner_profiles_relationship_check CHECK (
    relationship IN ('self', 'child', 'teen', 'other')
  ),
  CONSTRAINT learner_profiles_school_level_check CHECK (
    school_level IS NULL OR school_level IN ('preschool', 'primary', 'secondary', 'cegep', 'university', 'adult', 'other')
  ),
  CONSTRAINT learner_profiles_academic_program_check CHECK (
    academic_program IS NULL OR academic_program IN ('regular', 'sn', 'ts', 'ib', 'enriched', 'other')
  ),
  CONSTRAINT learner_profiles_explanation_preference_check CHECK (
    explanation_preference IS NULL OR explanation_preference IN (
      'examples_first',
      'theory_first',
      'step_by_step',
      'practice_first',
      'visual_schema'
    )
  ),
  CONSTRAINT learner_profiles_birth_year_reasonable CHECK (
    birth_year IS NULL OR (birth_year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::int)
  ),
  CONSTRAINT learner_profiles_grade_percent_check CHECK (
    current_grade_percent IS NULL OR (current_grade_percent >= 0 AND current_grade_percent <= 100)
  )
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS learner_profile_id uuid REFERENCES public.learner_profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_learner_profiles_owner_active
  ON public.learner_profiles (owner_user_id, archived_at, is_default DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_learner_profile
  ON public.bookings (learner_profile_id)
  WHERE learner_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_profiles_one_default
  ON public.learner_profiles (owner_user_id)
  WHERE is_default = true AND archived_at IS NULL;

ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learner_profiles_owner_select" ON public.learner_profiles;
CREATE POLICY "learner_profiles_owner_select"
  ON public.learner_profiles FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE b.learner_profile_id = learner_profiles.id
        AND t.user_id = auth.uid()
        AND b.status IN ('confirmed', 'completed')
    )
  );

DROP POLICY IF EXISTS "learner_profiles_owner_insert" ON public.learner_profiles;
CREATE POLICY "learner_profiles_owner_insert"
  ON public.learner_profiles FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "learner_profiles_owner_update" ON public.learner_profiles;
CREATE POLICY "learner_profiles_owner_update"
  ON public.learner_profiles FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "learner_profiles_owner_delete" ON public.learner_profiles;
CREATE POLICY "learner_profiles_owner_delete"
  ON public.learner_profiles FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- Keep booking learner references owned by the booking's student/parent.
DROP POLICY IF EXISTS "bookings_insert_participants" ON public.bookings;
CREATE POLICY "bookings_insert_participants"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    (
      student_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.teachers t
        WHERE t.id = teacher_id AND t.user_id = auth.uid()
      )
    )
    AND (
      learner_profile_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.learner_profiles lp
        WHERE lp.id = learner_profile_id
          AND lp.owner_user_id = student_id
          AND lp.archived_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "bookings_update_participants" ON public.bookings;
CREATE POLICY "bookings_update_participants"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (
      student_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.teachers t
        WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
      )
    )
    AND (
      learner_profile_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.learner_profiles lp
        WHERE lp.id = learner_profile_id
          AND lp.owner_user_id = student_id
          AND lp.archived_at IS NULL
      )
    )
  );

COMMENT ON TABLE public.learner_profiles IS
  'Private learner sub-profiles owned by an account holder; can represent a child, teen, or adult learner.';
COMMENT ON COLUMN public.bookings.learner_profile_id IS
  'Optional learner context selected by the student/parent at booking time.';
