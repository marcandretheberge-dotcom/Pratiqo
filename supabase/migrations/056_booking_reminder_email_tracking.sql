-- Track lesson reminder and post-class review invitation emails (idempotent cron sends).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_request_email_sent_at timestamptz;

COMMENT ON COLUMN public.bookings.reminder_24h_sent_at IS 'When the 24h-before-lesson reminder emails were sent.';
COMMENT ON COLUMN public.bookings.reminder_1h_sent_at IS 'When the 1h-before-lesson reminder emails were sent.';
COMMENT ON COLUMN public.bookings.review_request_email_sent_at IS 'When the post-class review invitation email was sent to the student.';
