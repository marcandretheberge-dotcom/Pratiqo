-- =============================================================================
-- 134_yopratiqo_server_only_writes.sql
--
-- Closes a direct-PostgREST bypass on the two YoPratiqo tables.
--
-- Problem (found in the Nov 2026 YoPratiqo audit)
-- -----------------------------------------------
-- Migrations 077 and 078 granted INSERT/UPDATE to `authenticated` with
-- owner-only RLS. Every legitimate write already goes through server routes
-- that use the service-role client AFTER sanitizing the payload:
--   • /api/yo/progress                       → parseProgressSnapshotPayload
--   • /api/bookings/[id]/yopratiqo-bridge    → parseClientConsentPayload +
--                                              assertSafeTeacherBridgeSummary
-- But a learner holding their own access token + the public API key could
-- call PostgREST directly and skip those sanitizers:
--   1. booking_yopratiqo_learning_summaries INSERT only checked booking
--      ownership, not that `teacher_id` is that booking's teacher; UPDATE
--      only re-checked `student_id`, so booking_id / teacher_id / summary
--      could be repointed or replaced with arbitrary (unsanitized, unbounded)
--      jsonb. The SELECT policy trusted the row's own `teacher_id`, so a
--      forged row became readable by an unrelated teacher.
--   2. yopratiqo_progress_snapshots INSERT/UPDATE let a learner write any
--      progress_state / score_band / course_id without the API allow-list.
--
-- Fix
-- ---
--   • Remove learner INSERT/UPDATE on both tables (policies + grants). Writes
--     are service-role only, i.e. only through the sanitizing routes.
--   • Keep owner SELECT and owner DELETE (self-service wipe / revoke).
--   • Rebuild the bridge SELECT policy so a teacher can only read a row whose
--     teacher_id matches the teacher on the linked booking. Existing forged
--     rows (if any) become invisible to the wrong teacher.
--   • Bound the summary jsonb shape/size (NOT VALID: enforced on new writes
--     without failing on any legacy row; validate after a data check).
--
-- What this migration does NOT do
-- -------------------------------
--   • No payment, tax, commission, booking or teacher-table changes.
--   • No definer-rights function. No new role grants.
--   • No data deletion.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) booking_yopratiqo_learning_summaries — server-only writes
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "byls_insert_student_own"
  ON public.booking_yopratiqo_learning_summaries;
DROP POLICY IF EXISTS "byls_update_student_own"
  ON public.booking_yopratiqo_learning_summaries;

REVOKE INSERT, UPDATE ON public.booking_yopratiqo_learning_summaries FROM authenticated;

-- SELECT: the student on the row, OR the teacher who actually owns the
-- linked booking. Outer columns are table-qualified on purpose: inside the
-- subquery an unqualified `teacher_id` would resolve to b.teacher_id.
DROP POLICY IF EXISTS "byls_select_participants"
  ON public.booking_yopratiqo_learning_summaries;
CREATE POLICY "byls_select_participants"
  ON public.booking_yopratiqo_learning_summaries FOR SELECT TO authenticated
  USING (
    booking_yopratiqo_learning_summaries.student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.teachers t ON t.id = b.teacher_id
      WHERE b.id = booking_yopratiqo_learning_summaries.booking_id
        AND b.teacher_id = booking_yopratiqo_learning_summaries.teacher_id
        AND t.user_id = auth.uid()
    )
  );

-- Summary must be a JSON object (or null) and stay small. The sanitized
-- server shape is well under 8 KB.
ALTER TABLE public.booking_yopratiqo_learning_summaries
  DROP CONSTRAINT IF EXISTS byls_summary_shape;
ALTER TABLE public.booking_yopratiqo_learning_summaries
  ADD CONSTRAINT byls_summary_shape CHECK (
    summary IS NULL
    OR (jsonb_typeof(summary) = 'object' AND pg_column_size(summary) <= 8192)
  ) NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) yopratiqo_progress_snapshots — server-only writes
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ypps_insert_owner" ON public.yopratiqo_progress_snapshots;
DROP POLICY IF EXISTS "ypps_update_owner" ON public.yopratiqo_progress_snapshots;

REVOKE INSERT, UPDATE ON public.yopratiqo_progress_snapshots FROM authenticated;

-- Owner SELECT ("ypps_select_owner") and owner DELETE ("ypps_delete_owner")
-- from migration 078 are intentionally kept.

COMMIT;
