-- One-shot student welcome email (OAuth + email signup); set after successful send.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_student_email_sent_at timestamptz;
