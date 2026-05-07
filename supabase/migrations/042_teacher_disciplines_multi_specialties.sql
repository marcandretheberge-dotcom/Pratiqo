-- Allow multiple specialties per discipline domain.
-- Previous schema enforced UNIQUE (teacher_id, discipline_id), which prevented adding
-- multiple specialties under the same discipline (e.g. Langues: Anglais + Français).

DO $$
BEGIN
  -- Drop the old unique constraint if present (name varies by environment).
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'teacher_disciplines'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%(teacher_id, discipline_id)%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.teacher_disciplines DROP CONSTRAINT ' || quote_ident(c.conname) || ';'
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'teacher_disciplines'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) LIKE '%(teacher_id, discipline_id)%'
      LIMIT 1
    );
  END IF;
END $$;

-- Enforce uniqueness at the specialty level (ignore NULL/empty specialties).
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_disciplines_unique_specialty
  ON public.teacher_disciplines (teacher_id, discipline_id, lower(trim(coalesce(specialite, ''))))
  WHERE coalesce(trim(specialite), '') <> '';

