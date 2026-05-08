-- Meeting links for online lessons (Phase 1).
-- Teachers can attach a video meeting URL to a booking; shared privately with the student.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS meeting_provider text,
  ADD COLUMN IF NOT EXISTS meeting_url_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_url_added_by uuid REFERENCES auth.users (id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_meeting_provider_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_meeting_provider_check
        CHECK (meeting_provider IS NULL OR meeting_provider IN ('zoom', 'google_meet', 'microsoft_teams', 'other'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.bookings.meeting_url IS
  'Optional video call link for online lessons (shared with student).';
COMMENT ON COLUMN public.bookings.meeting_provider IS
  'Derived provider label for meeting_url (zoom/google_meet/microsoft_teams/other).';
COMMENT ON COLUMN public.bookings.meeting_url_added_by IS
  'auth.users id of the teacher who last set meeting_url.';

