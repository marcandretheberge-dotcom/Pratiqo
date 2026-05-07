-- Phase 1 refinement: learner context type and lightweight non-academic fields.

ALTER TABLE public.learner_profiles
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS target_language text,
  ADD COLUMN IF NOT EXISTS current_level text,
  ADD COLUMN IF NOT EXISTS instrument text,
  ADD COLUMN IF NOT EXISTS practice_frequency text,
  ADD COLUMN IF NOT EXISTS academic_program_label text,
  ADD COLUMN IF NOT EXISTS academic_program_unsure boolean NOT NULL DEFAULT false;

ALTER TABLE public.learner_profiles
  DROP CONSTRAINT IF EXISTS learner_profiles_context_type_check,
  ADD CONSTRAINT learner_profiles_context_type_check CHECK (
    context_type IS NULL OR context_type IN ('academic', 'language', 'music', 'general')
  );

ALTER TABLE public.learner_profiles
  DROP CONSTRAINT IF EXISTS learner_profiles_academic_program_check,
  ADD CONSTRAINT learner_profiles_academic_program_check CHECK (
    academic_program IS NULL OR academic_program IN (
      'regular',
      'sn',
      'ts',
      'ib',
      'enriched',
      'technical_science',
      'natural_science',
      'advanced',
      'exam_prep',
      'unsure',
      'other'
    )
  );

COMMENT ON COLUMN public.learner_profiles.context_type IS
  'Optional learning context type used to show only relevant learner fields: academic, language, music, or general.';
