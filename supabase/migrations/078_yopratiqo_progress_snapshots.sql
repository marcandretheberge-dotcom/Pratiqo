-- =============================================================================
-- 078_yopratiqo_progress_snapshots.sql
--
-- First-party, per-user YoPratiqo module progress snapshots. Powers the
-- booking-time teacher bridge introduced in migration 077: when a student
-- consents to share their YoPratiqo progress for a specific booking, the
-- bridge API loads this user's own snapshots, builds a SAFE summary
-- server-side, and writes it onto `booking_yopratiqo_learning_summaries`.
--
-- Why a dedicated table (not extending `student_progress` or `bookings`)
-- ----------------------------------------------------------------------
--   • `student_progress` is keyed by booking lifecycle; this table is
--     keyed by YoPratiqo course/module + user. Different lifecycle,
--     different authorization rules.
--   • Teachers must NEVER read this table directly. The only path from a
--     YoPratiqo snapshot to a teacher is via the consent-gated, sanitized
--     summary stored on `booking_yopratiqo_learning_summaries`.
--   • Future iterations (event ledger, weekly digests, retention) can
--     evolve this table without touching booking RLS.
--
-- Privacy contract reflected in this schema
-- -----------------------------------------
--   • Only safe, narrow columns: course/module identifiers, completion
--     state, narrow tag arrays, score band (no numeric score, no quiz
--     answer log), companion stage, and an opaque version token.
--   • There is no JSONB summary column and no free-form metadata column.
--     If a future schema needs more, it must be a SEPARATE, reviewed
--     addition.
--   • Hard-blocked at the application layer (lib/yopratiqo/progressSnapshotPersistence.ts):
--     raw quiz answers, attempt logs, keystroke history, private notes,
--     payment data — none of these can be persisted via the supported
--     API path.
--
-- IMPORTANT — what this migration does NOT do
-- -------------------------------------------
--   • It does not change checkout, payment math, tax logic, or commission.
--   • It does not enable paid YoPratiqo checkout.
--   • It does not create real credit balances.
--   • It does not introduce any owner-bypass (SD) function.
--   • It does not grant any access to anon.
--   • It does not grant teachers any read access — the only consent-gated
--     teacher surface is `booking_yopratiqo_learning_summaries`.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.yopratiqo_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  module_id text NOT NULL,
  module_title text NOT NULL,
  discipline text NOT NULL,
  level_label text,
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  progress_state text NOT NULL DEFAULT 'started'
    CHECK (progress_state IN ('started', 'completed', 'reviewed')),
  skill_tags text[] NOT NULL DEFAULT '{}',
  difficulty_tags text[] NOT NULL DEFAULT '{}',
  score_band text,
  companion_stage text,
  summary_version text NOT NULL DEFAULT 'yopratiqo-progress-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yopratiqo_progress_snapshots_user_module_uniq
    UNIQUE (user_id, course_id, module_id)
);

COMMENT ON TABLE public.yopratiqo_progress_snapshots IS
  'Per-user YoPratiqo module progress snapshots. Owner-only RLS. Teachers MUST NOT read this table directly; the only consent-gated, sanitized teacher surface is booking_yopratiqo_learning_summaries.summary, written server-side after the student grants explicit per-booking consent. Never store raw quiz answers, attempt logs, keystroke history, or private telemetry here.';

COMMENT ON COLUMN public.yopratiqo_progress_snapshots.progress_state IS
  'Narrow lifecycle: started | completed | reviewed. Enforced by CHECK constraint above; the application layer mirrors the same allow-list in lib/yopratiqo/progressSnapshotPersistence.ts.';

COMMENT ON COLUMN public.yopratiqo_progress_snapshots.score_band IS
  'Optional opaque band label (e.g. "needs_practice", "solid"). Intentionally NOT a numeric score and intentionally NOT a quiz-answer log.';

COMMENT ON COLUMN public.yopratiqo_progress_snapshots.summary_version IS
  'Schema version token. Bump when the safe-field shape changes in a way that requires reader migration.';

CREATE INDEX IF NOT EXISTS yopratiqo_progress_snapshots_user_idx
  ON public.yopratiqo_progress_snapshots (user_id);
CREATE INDEX IF NOT EXISTS yopratiqo_progress_snapshots_user_course_idx
  ON public.yopratiqo_progress_snapshots (user_id, course_id);
CREATE INDEX IF NOT EXISTS yopratiqo_progress_snapshots_user_activity_idx
  ON public.yopratiqo_progress_snapshots (user_id, last_activity_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — owner-only on every operation
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.yopratiqo_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: only the owner can read their own progress. Teachers cannot
-- read this table at all (no policy grants them access). The booking
-- bridge route reads through service-role explicitly after verifying
-- the authenticated user owns the snapshots.
DROP POLICY IF EXISTS "ypps_select_owner" ON public.yopratiqo_progress_snapshots;
CREATE POLICY "ypps_select_owner"
  ON public.yopratiqo_progress_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: only the owner can insert their own progress.
DROP POLICY IF EXISTS "ypps_insert_owner" ON public.yopratiqo_progress_snapshots;
CREATE POLICY "ypps_insert_owner"
  ON public.yopratiqo_progress_snapshots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only the owner. WITH CHECK prevents repointing user_id.
DROP POLICY IF EXISTS "ypps_update_owner" ON public.yopratiqo_progress_snapshots;
CREATE POLICY "ypps_update_owner"
  ON public.yopratiqo_progress_snapshots FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: only the owner. Lets a student wipe their YoPratiqo footprint
-- without admin involvement.
DROP POLICY IF EXISTS "ypps_delete_owner" ON public.yopratiqo_progress_snapshots;
CREATE POLICY "ypps_delete_owner"
  ON public.yopratiqo_progress_snapshots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Grants — anon revoked, authenticated + service_role allowed
-- ─────────────────────────────────────────────────────────────────────────

REVOKE ALL ON public.yopratiqo_progress_snapshots FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yopratiqo_progress_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yopratiqo_progress_snapshots TO service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger (matches the project convention)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.yopratiqo_progress_snapshots_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ypps_set_updated_at
  ON public.yopratiqo_progress_snapshots;
CREATE TRIGGER trg_ypps_set_updated_at
  BEFORE UPDATE ON public.yopratiqo_progress_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.yopratiqo_progress_snapshots_set_updated_at();
