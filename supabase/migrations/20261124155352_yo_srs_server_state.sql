-- =============================================================================
-- 20261124155352_yo_srs_server_state.sql
--
-- Server-side learning state for YoPratiqo, Phase 0 step 1 of the shared
-- learning-engines spec (spec-shared-engines.md §1.5, §1.6, §2): item-level
-- spaced-repetition (SRS) state moves from localStorage to the server so a
-- learner's review schedule survives device changes.
--
-- Why dedicated tables (not the snapshots table of migration 078)
-- ----------------------------------------------------------------------
--   • Migration 078's own table comment forbids attempt logs in
--     `yopratiqo_progress_snapshots`. SRS item state is scheduling state
--     (Leitner box, due date, aggregate counters) — it gets its own table,
--     exactly as the spec requires. The snapshots table is untouched.
--   • What is stored here is AGGREGATE ONLY: attempts count, completion
--     flags, streak, timestamps. There is NO column for a learner's answer,
--     no raw quiz data, no free-form metadata — the same privacy posture as
--     migration 078, enforced by the application layer in
--     lib/yo/srs/srsPersistence.ts (FORBIDDEN_TEACHER_BRIDGE_FIELDS deny-list).
--   • Teachers must NEVER read these tables. The only teacher surface stays
--     `booking_yopratiqo_learning_summaries.summary`, written server-side
--     after explicit per-booking consent. No policy below grants teachers
--     anything, and no access is granted to anon.
--
-- Tables
-- ------
--   • public.yo_srs_items        — one row per (user, item): Leitner state.
--   • public.yo_learning_events  — append-only XP ledger appended to by the
--                                  SRS record route (spec §2.4).
--   • public.yo_srs_import_state — one row per user, written by the one-time
--                                  localStorage import (spec §2.4); its mere
--                                  existence refuses any re-import.
--
-- IMPORTANT — what this migration does NOT do
-- -------------------------------------------
--   • It does not change checkout, payment math, tax logic, or commission.
--   • It does not enable paid YoPratiqo checkout.
--   • It does not create the error-log, speech, or teacher-brief tables —
--     those belong to later spec steps (Engines B, C, D).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.yo_srs_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  language text NOT NULL,
  course_id text NOT NULL,
  streak integer NOT NULL DEFAULT 0
    CHECK (streak >= 0 AND streak <= 4),
  attempts integer NOT NULL DEFAULT 0
    CHECK (attempts >= 0 AND attempts <= 100000),
  completed boolean NOT NULL DEFAULT false,
  independent boolean NOT NULL DEFAULT false,
  -- Epoch milliseconds, mirroring the client engine's ActivityRecord
  -- exactly (lib/yo/srs/engine.ts) so server and client schedules agree
  -- bit-for-bit; timestamptz conversion happens only at display time.
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  last_at bigint NOT NULL,
  next_review_at bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yo_srs_items_independent_implies_completed
    CHECK (NOT independent OR completed),
  CONSTRAINT yo_srs_items_user_item_uniq
    UNIQUE (user_id, item_id)
);

COMMENT ON TABLE public.yo_srs_items IS
  'Per-user, per-item YoPratiqo SRS (Leitner) state: streak 0-4, aggregate attempts, completion flags, epoch-ms schedule. Service-only access with RLS. Teachers MUST NOT read this table directly. Never store raw answers, attempt logs, or keystroke history here — aggregate scheduling state only (see migration 078 for the snapshots-table constraint this respects).';

CREATE INDEX IF NOT EXISTS yo_srs_items_user_due_idx
  ON public.yo_srs_items (user_id, language, next_review_at);
CREATE INDEX IF NOT EXISTS yo_srs_items_user_idx
  ON public.yo_srs_items (user_id);

CREATE TABLE IF NOT EXISTS public.yo_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL,
  event_type text NOT NULL,
  xp integer NOT NULL DEFAULT 0
    CHECK (xp >= 0 AND xp <= 1000),
  item_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.yo_learning_events IS
  'Append-only YoPratiqo XP ledger (spec §1.6). Written server-side by the SRS record route; service-only writes; no UPDATE grant — events are never rewritten. Teachers MUST NOT read this table.';

CREATE INDEX IF NOT EXISTS yo_learning_events_user_created_idx
  ON public.yo_learning_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.yo_srs_import_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_count integer NOT NULL DEFAULT 0,
  dropped_count integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.yo_srs_import_state IS
  'One row per user marking the one-time localStorage -> server SRS import (spec §2.4). Existence of a row refuses any re-import. Service-only access with RLS.';

-- ─────────────────────────────────────────────────────────────────────────
-- Only the authenticated application routes persist or expose SRS state.
ALTER TABLE public.yo_srs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_srs_import_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.yo_srs_items, public.yo_learning_events, public.yo_srs_import_state
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.yo_srs_items TO service_role;
GRANT SELECT, INSERT ON public.yo_learning_events, public.yo_srs_import_state TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS yo_learning_events_attempt_type_uidx
  ON public.yo_learning_events(user_id, attempt_id, event_type);

-- Both mutators lock the same user key. Record compares a revision read
-- before the RPC; its caller retries with fresh state on a stale read.
CREATE OR REPLACE FUNCTION public.yo_srs_commit_attempt(
  p_user_id uuid, p_attempt_id uuid, p_expected_revision uuid, p_item jsonb, p_events jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  current_revision uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 93124));
  IF EXISTS (SELECT 1 FROM public.yo_learning_events
      WHERE user_id = p_user_id AND attempt_id = p_attempt_id) THEN
    RETURN 'duplicate';
  END IF;
  SELECT revision INTO current_revision FROM public.yo_srs_items
    WHERE user_id = p_user_id AND item_id = p_item->>'item_id';
  IF current_revision IS DISTINCT FROM p_expected_revision THEN
    RETURN 'conflict';
  END IF;

  INSERT INTO public.yo_srs_items
    (user_id, item_id, language, course_id, streak, attempts, completed, independent, last_at, next_review_at)
  SELECT p_user_id, r.item_id, r.language, r.course_id, r.streak, r.attempts,
    r.completed, r.independent, r.last_at, r.next_review_at
  FROM pg_catalog.jsonb_populate_record(NULL::public.yo_srs_items, p_item) AS r
  ON CONFLICT (user_id, item_id) DO UPDATE SET
    streak = EXCLUDED.streak, attempts = EXCLUDED.attempts,
    completed = EXCLUDED.completed, independent = EXCLUDED.independent,
    last_at = EXCLUDED.last_at, next_review_at = EXCLUDED.next_review_at,
    revision = pg_catalog.gen_random_uuid(), updated_at = now();

  INSERT INTO public.yo_learning_events(user_id, event_type, xp, item_id, attempt_id)
  SELECT p_user_id, e.event_type, e.xp, p_item->>'item_id', p_attempt_id
  FROM pg_catalog.jsonb_to_recordset(p_events) AS e(event_type text, xp integer);
  RETURN 'recorded';
END;
$$;

CREATE OR REPLACE FUNCTION public.yo_srs_import_records(
  p_user_id uuid, p_rows jsonb, p_dropped integer
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  inserted_count integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 93124));
  IF EXISTS (SELECT 1 FROM public.yo_srs_import_state WHERE user_id = p_user_id) THEN
    RETURN -1;
  END IF;
  IF pg_catalog.jsonb_array_length(p_rows) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.yo_srs_items AS stored
    (user_id, item_id, language, course_id, streak, attempts, completed, independent, last_at, next_review_at)
  SELECT p_user_id, r.item_id, r.language, r.course_id, r.streak, r.attempts,
    r.completed, r.independent, r.last_at, r.next_review_at
  FROM pg_catalog.jsonb_populate_recordset(NULL::public.yo_srs_items, p_rows) AS r
  ON CONFLICT (user_id, item_id) DO UPDATE SET
    streak = EXCLUDED.streak, attempts = EXCLUDED.attempts,
    completed = EXCLUDED.completed, independent = EXCLUDED.independent,
    last_at = EXCLUDED.last_at, next_review_at = EXCLUDED.next_review_at,
    revision = pg_catalog.gen_random_uuid(), updated_at = now()
  WHERE EXCLUDED.last_at > stored.last_at;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  INSERT INTO public.yo_srs_import_state(user_id, imported_count, dropped_count)
    VALUES(p_user_id, inserted_count, p_dropped);
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.yo_srs_commit_attempt(uuid,uuid,uuid,jsonb,jsonb),
  public.yo_srs_import_records(uuid,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yo_srs_commit_attempt(uuid,uuid,uuid,jsonb,jsonb),
  public.yo_srs_import_records(uuid,jsonb,integer) TO service_role;
