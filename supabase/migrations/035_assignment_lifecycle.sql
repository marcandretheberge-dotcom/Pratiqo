-- Homework / practice lifecycle metadata.
-- Completed work should remain auditable, but leave the active queue.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.assignments
SET submitted_at = COALESCE(submitted_at, created_at)
WHERE status = 'submitted'
  AND submitted_at IS NULL;

UPDATE public.assignments
SET reviewed_at = COALESCE(reviewed_at, submitted_at, created_at)
WHERE status = 'reviewed'
  AND reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_student_active
  ON public.assignments (student_id, status, due_date, created_at DESC)
  WHERE archived_at IS NULL AND status <> 'reviewed';

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_active
  ON public.assignments (teacher_id, status, due_date, created_at DESC)
  WHERE archived_at IS NULL AND status <> 'reviewed';

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_review_queue
  ON public.assignments (teacher_id, submitted_at DESC, created_at DESC)
  WHERE archived_at IS NULL AND status = 'submitted';

CREATE INDEX IF NOT EXISTS idx_assignments_reviewed_history
  ON public.assignments (student_id, reviewed_at DESC, created_at DESC)
  WHERE status = 'reviewed';
