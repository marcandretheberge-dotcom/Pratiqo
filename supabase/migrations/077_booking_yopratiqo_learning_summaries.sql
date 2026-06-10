-- =============================================================================
-- 077_booking_yopratiqo_learning_summaries.sql
--
-- Per-booking consent + safe summary store for the YoPratiqo → Pratiqo
-- teacher bridge.
--
-- Why a dedicated table (not new columns on `bookings`)
-- ----------------------------------------------------
--   • The bridge surface has different lifecycle and authorization rules
--     than the booking itself. Booking UPDATE policies were intentionally
--     dropped in migration 065 (no client-side mutations to bookings); the
--     bridge needs explicit, narrow INSERT/UPDATE policies for the student
--     only. A separate table keeps the booking-update policy locked while
--     still letting the bridge evolve.
--   • Teachers can be ALLOWED to READ the summary for their own bookings,
--     but they must NEVER be able to fabricate consent or summary content.
--     A dedicated table makes that contract enforceable via RLS, not by
--     code convention.
--   • Future iterations (revocation, multi-version, retention) can change
--     this table's schema without touching the booking core.
--
-- Privacy contract reflected in this schema
-- -----------------------------------------
--   • `consent_granted` is the only authoritative consent flag. Missing or
--     `false` ⇒ NOT shared.
--   • `summary` is a `jsonb` that the application server is required to
--     sanitize via `assertSafeTeacherBridgeSummary` before insert. No
--     SQL-level CHECK is added here because the safe-summary shape lives
--     in TypeScript and evolves; pushing it into SQL would either be
--     incomplete (string scan against jsonb is brittle) or duplicative.
--     Defense-in-depth: the API route is the only intended insert path.
--   • Raw quiz answers, raw attempt logs, keystroke history, and any
--     private learner telemetry are forbidden by the TypeScript-side guard
--     and by the consent-card test suite.
--
-- IMPORTANT — what this migration does NOT do
-- -------------------------------------------
--   • It does not change checkout, payment math, tax logic, or commission.
--   • It does not change bookings RLS (the dropped UPDATE/DELETE policies
--     from 065 stay dropped — clients still cannot mutate bookings).
--   • It does not enable paid YoPratiqo checkout.
--   • It does not create real credit balances.
--   • It does not introduce any owner-bypass (SD) function.
--   • It does not grant any access to anon.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.booking_yopratiqo_learning_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- `teachers.id` is the slug/text PK used everywhere in this codebase
  -- (see migration 000). Keeping the type consistent with bookings.teacher_id
  -- so the RLS join below works without a cast.
  teacher_id text NOT NULL,
  consent_granted boolean NOT NULL DEFAULT false,
  consent_granted_at timestamptz,
  summary_version text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_yopratiqo_learning_summaries IS
  'Per-booking consent + sanitized YoPratiqo learning summary shared with the booking''s teacher. Student-only writes, both-participant reads. Summary jsonb MUST be sanitized server-side via assertSafeTeacherBridgeSummary before insert. Never store raw quiz answers, attempt logs, or private telemetry.';

COMMENT ON COLUMN public.booking_yopratiqo_learning_summaries.consent_granted IS
  'Explicit student consent for THIS booking. Missing/false means not shared. Teacher cannot flip this.';

COMMENT ON COLUMN public.booking_yopratiqo_learning_summaries.summary IS
  'Safe summary jsonb sanitized by the server. Allowed keys mirror lib/yopratiqo/teacherBridge.YoPratiqoProgressSummary. Forbidden keys (rawQuiz, quizAnswers, selectedOption, correctOptionId, answerLog, keystrokeHistory, …) MUST be rejected by the application before insert.';

CREATE INDEX IF NOT EXISTS booking_yopratiqo_learning_summaries_booking_idx
  ON public.booking_yopratiqo_learning_summaries (booking_id);
CREATE INDEX IF NOT EXISTS booking_yopratiqo_learning_summaries_student_idx
  ON public.booking_yopratiqo_learning_summaries (student_id);
CREATE INDEX IF NOT EXISTS booking_yopratiqo_learning_summaries_teacher_idx
  ON public.booking_yopratiqo_learning_summaries (teacher_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.booking_yopratiqo_learning_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT: either the student who owns the booking OR the teacher who owns
-- the booking can read the summary row. The join through `public.teachers`
-- matches the booking SELECT policy in 001_rls_policies.sql.
DROP POLICY IF EXISTS "byls_select_participants"
  ON public.booking_yopratiqo_learning_summaries;
CREATE POLICY "byls_select_participants"
  ON public.booking_yopratiqo_learning_summaries FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.user_id = auth.uid()
    )
  );

-- INSERT: only the student who owns the linked booking, and only for their
-- own student_id. The booking-exists check prevents an arbitrary user from
-- inserting summaries for non-existent or stranger-owned bookings.
DROP POLICY IF EXISTS "byls_insert_student_own"
  ON public.booking_yopratiqo_learning_summaries;
CREATE POLICY "byls_insert_student_own"
  ON public.booking_yopratiqo_learning_summaries FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.student_id = auth.uid()
    )
  );

-- UPDATE: only the student. The student can revoke/refresh consent.
-- The teacher_id, booking_id, and student_id fields cannot be repointed by
-- the WITH CHECK clause (auth.uid() must still match student_id).
DROP POLICY IF EXISTS "byls_update_student_own"
  ON public.booking_yopratiqo_learning_summaries;
CREATE POLICY "byls_update_student_own"
  ON public.booking_yopratiqo_learning_summaries FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- DELETE: only the student. Lets a student fully revoke the share.
DROP POLICY IF EXISTS "byls_delete_student_own"
  ON public.booking_yopratiqo_learning_summaries;
CREATE POLICY "byls_delete_student_own"
  ON public.booking_yopratiqo_learning_summaries FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────────────────

REVOKE ALL ON public.booking_yopratiqo_learning_summaries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_yopratiqo_learning_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_yopratiqo_learning_summaries TO service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger (matches the project convention)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.booking_yopratiqo_learning_summaries_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_byls_set_updated_at
  ON public.booking_yopratiqo_learning_summaries;
CREATE TRIGGER trg_byls_set_updated_at
  BEFORE UPDATE ON public.booking_yopratiqo_learning_summaries
  FOR EACH ROW EXECUTE FUNCTION public.booking_yopratiqo_learning_summaries_set_updated_at();
