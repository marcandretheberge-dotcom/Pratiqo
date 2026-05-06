-- Teacher post-class confirmation metadata.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_outcome text;

COMMENT ON COLUMN public.bookings.completed_at IS 'When a teacher/system marked the lesson as completed.';
COMMENT ON COLUMN public.bookings.completion_outcome IS 'Teacher completion outcome: held, absent, or technical_issue.';
