-- Phase 1 Resolution Center: structured support cases tied to bookings.

CREATE TABLE IF NOT EXISTS public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
  opened_by_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  teacher_id text REFERENCES public.teachers (id) ON DELETE SET NULL,

  role text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',

  title text,
  description text NOT NULL,
  requested_resolution text,
  evidence_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  internal_notes text,

  payout_hold boolean NOT NULL DEFAULT false,
  payout_hold_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,

  CONSTRAINT support_cases_role_check CHECK (role IN ('student', 'teacher', 'admin')),
  CONSTRAINT support_cases_category_check CHECK (
    category IN (
      'teacher_no_show',
      'student_no_show',
      'late_cancellation',
      'lesson_too_short',
      'technical_issue',
      'wrong_address_or_location',
      'refund_request',
      'payment_or_receipt_issue',
      'inappropriate_behavior',
      'other'
    )
  ),
  CONSTRAINT support_cases_status_check CHECK (
    status IN ('new', 'waiting_other_party', 'under_review', 'resolved', 'refunded', 'credited', 'closed')
  ),
  CONSTRAINT support_cases_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT support_cases_requested_resolution_check CHECK (
    requested_resolution IS NULL OR requested_resolution IN (
      'refund',
      'credit',
      'reschedule',
      'payout_review',
      'information_only',
      'other'
    )
  ),
  CONSTRAINT support_cases_description_length_check CHECK (
    char_length(trim(description)) BETWEEN 10 AND 4000
  )
);

CREATE INDEX IF NOT EXISTS idx_support_cases_booking ON public.support_cases (booking_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_opened_by ON public.support_cases (opened_by_user_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_student ON public.support_cases (student_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_teacher ON public.support_cases (teacher_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_status ON public.support_cases (status);
CREATE INDEX IF NOT EXISTS idx_support_cases_category ON public.support_cases (category);
CREATE INDEX IF NOT EXISTS idx_support_cases_created ON public.support_cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_payout_hold_open
  ON public.support_cases (booking_id, payout_hold, status)
  WHERE payout_hold = true AND status IN ('new', 'waiting_other_party', 'under_review');

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_cases_select_participants" ON public.support_cases;
CREATE POLICY "support_cases_select_participants"
  ON public.support_cases FOR SELECT TO authenticated
  USING (
    opened_by_user_id = auth.uid()
    OR student_id = auth.uid()
    OR teacher_id IN (
      SELECT t.id
      FROM public.teachers t
      WHERE t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "support_cases_insert_booking_participants" ON public.support_cases;
CREATE POLICY "support_cases_insert_booking_participants"
  ON public.support_cases FOR INSERT TO authenticated
  WITH CHECK (
    opened_by_user_id = auth.uid()
    AND booking_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = support_cases.booking_id
        AND b.student_id = support_cases.student_id
        AND b.teacher_id = support_cases.teacher_id
        AND (
          (
            b.student_id = auth.uid()
            AND support_cases.role = 'student'
          )
          OR (
            support_cases.role = 'teacher'
            AND EXISTS (
              SELECT 1
              FROM public.teachers t
              WHERE t.id = b.teacher_id
                AND t.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "support_cases_no_client_update" ON public.support_cases;
CREATE POLICY "support_cases_no_client_update"
  ON public.support_cases FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "support_cases_no_client_delete" ON public.support_cases;
CREATE POLICY "support_cases_no_client_delete"
  ON public.support_cases FOR DELETE TO authenticated
  USING (false);

COMMENT ON TABLE public.support_cases IS
  'Structured Resolution Center cases tied to bookings whenever possible.';
COMMENT ON COLUMN public.support_cases.payout_hold IS
  'When true and the case is open, teacher payout is held until manual resolution.';
