-- Bounded Yo speech pilot. No audio or full transcripts are persisted.
-- Service-role RPCs only; the route derives the owner from auth.getUser().
-- Every attempted provider turn permanently reserves $0.20, even on timeout.
-- Fifty reservations exhaust the $10 ceiling; deleting an account cannot refund it.
BEGIN;

CREATE TABLE IF NOT EXISTS public.yo_speech_budget (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  cap_micro_usd bigint NOT NULL DEFAULT 10000000 CHECK (cap_micro_usd BETWEEN 0 AND 10000000),
  reserved_micro_usd bigint NOT NULL DEFAULT 0 CHECK (reserved_micro_usd BETWEEN 0 AND cap_micro_usd),
  blocked boolean NOT NULL DEFAULT false
);
INSERT INTO public.yo_speech_budget(id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.yo_speech_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  language text NOT NULL CHECK (language IN ('it','ja','es','fr','en','de','pt','zh')),
  scenario text NOT NULL CHECK (scenario IN ('cafe','directions','hotel','introduction','workplace')),
  consent_version text NOT NULL CHECK (consent_version = 'yo-voice-2026-11-24'),
  remember_corrections boolean NOT NULL,
  reserved_micro_usd integer NOT NULL DEFAULT 200000 CHECK (reserved_micro_usd = 200000),
  reserved_milliseconds integer NOT NULL DEFAULT 30000 CHECK (reserved_milliseconds = 30000),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','failed')),
  actual_micro_usd bigint CHECK (actual_micro_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  PRIMARY KEY (user_id, request_id)
);
CREATE INDEX IF NOT EXISTS yo_speech_usage_owner_time ON public.yo_speech_usage(user_id, created_at DESC);

-- Opt-in derived phrases only, with the existing shared SRS transition engine.
-- Separate from the Italian-only course catalogue so it cannot corrupt course due queues.
CREATE TABLE IF NOT EXISTS public.yo_error_events (
  user_id uuid NOT NULL,
  id uuid NOT NULL,
  language text NOT NULL CHECK (language IN ('it','ja','es','fr','en','de','pt','zh')),
  locale text NOT NULL CHECK (locale IN ('fr','en','es')),
  target text NOT NULL CHECK (char_length(target) BETWEEN 1 AND 160),
  hint text NOT NULL CHECK (char_length(hint) BETWEEN 1 AND 240),
  srs jsonb NOT NULL CHECK (jsonb_typeof(srs) = 'object'),
  due_at bigint NOT NULL CHECK (due_at >= 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, id) REFERENCES public.yo_speech_usage(user_id, request_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS yo_speech_reviews_due ON public.yo_error_events(user_id, language, due_at);
CREATE TABLE IF NOT EXISTS public.yo_speech_review_receipts (
  user_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  item_id uuid NOT NULL,
  PRIMARY KEY (user_id, attempt_id),
  FOREIGN KEY (user_id, item_id) REFERENCES public.yo_error_events(user_id, id) ON DELETE CASCADE
);

ALTER TABLE public.yo_speech_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_speech_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_speech_review_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.yo_speech_budget, public.yo_speech_usage, public.yo_error_events, public.yo_speech_review_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.yo_speech_budget, public.yo_speech_usage, public.yo_error_events, public.yo_speech_review_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.yo_speech_account_available(p_user_id uuid)
-- auth.users is intentionally not readable by service_role in production.
-- This narrowly scoped boolean predicate is the sole definer function; it
-- exposes no auth row, is service-only below, and has no dynamic SQL or writes.
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_user_id AND COALESCE(p.is_active, true)
      AND p.deletion_requested_at IS NULL AND p.deleted_at IS NULL
      AND u.is_anonymous = false AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  );
$$;

CREATE OR REPLACE FUNCTION public.yo_speech_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE budget public.yo_speech_budget%ROWTYPE; consumed bigint;
BEGIN
  IF NOT public.yo_speech_account_available(p_user_id) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'unavailable');
  END IF;
  SELECT * INTO budget FROM public.yo_speech_budget WHERE id;
  IF NOT FOUND OR budget.blocked OR budget.reserved_micro_usd + 200000 > budget.cap_micro_usd THEN
    RETURN jsonb_build_object('available', false, 'reason', 'pilot_complete');
  END IF;
  SELECT COALESCE(sum(reserved_milliseconds), 0) INTO consumed FROM public.yo_speech_usage WHERE user_id = p_user_id;
  IF consumed + 30000 > 300000 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'trial_complete', 'remainingSeconds', 0);
  END IF;
  RETURN jsonb_build_object('available', true, 'remainingSeconds', (300000 - consumed) / 1000);
END;
$$;

CREATE OR REPLACE FUNCTION public.yo_speech_reserve(
  p_user_id uuid, p_request_id uuid, p_language text, p_scenario text, p_consent text, p_remember boolean
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE budget public.yo_speech_budget%ROWTYPE; consumed bigint;
BEGIN
  -- A singleton row lock serializes reservations across all server instances.
  SELECT * INTO budget FROM public.yo_speech_budget WHERE id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'unavailable'; END IF;
  IF NOT public.yo_speech_account_available(p_user_id) THEN RETURN 'unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.yo_speech_usage WHERE user_id = p_user_id AND request_id = p_request_id) THEN RETURN 'duplicate'; END IF;
  IF budget.blocked OR budget.reserved_micro_usd + 200000 > budget.cap_micro_usd THEN RETURN 'pilot_complete'; END IF;
  SELECT COALESCE(sum(reserved_milliseconds), 0) INTO consumed FROM public.yo_speech_usage WHERE user_id = p_user_id;
  IF consumed + 30000 > 300000 THEN RETURN 'trial_complete'; END IF;
  IF (SELECT count(*) FROM public.yo_speech_usage WHERE user_id = p_user_id AND created_at > clock_timestamp() - interval '1 minute') >= 3 THEN RETURN 'rate_limit'; END IF;
  UPDATE public.yo_speech_usage SET state = 'failed', finished_at = clock_timestamp()
    WHERE user_id = p_user_id AND state = 'pending' AND created_at < clock_timestamp() - interval '65 seconds';
  IF EXISTS (SELECT 1 FROM public.yo_speech_usage WHERE user_id = p_user_id AND state = 'pending') THEN RETURN 'busy'; END IF;
  INSERT INTO public.yo_speech_usage(user_id, request_id, language, scenario, consent_version, remember_corrections)
    VALUES (p_user_id, p_request_id, p_language, p_scenario, p_consent, p_remember);
  UPDATE public.yo_speech_budget SET reserved_micro_usd = reserved_micro_usd + 200000 WHERE id;
  RETURN 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.yo_speech_finish(
  p_user_id uuid, p_request_id uuid, p_success boolean, p_cost bigint, p_correction jsonb, p_block boolean DEFAULT false
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE usage public.yo_speech_usage%ROWTYPE;
BEGIN
  -- Match reserve's lock order, including the circuit-breaker path.
  PERFORM 1 FROM public.yo_speech_budget WHERE id FOR UPDATE;
  SELECT * INTO usage FROM public.yo_speech_usage WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF usage.state <> 'pending' THEN RETURN 'duplicate'; END IF;
  IF p_cost < 0 OR (p_success AND p_cost IS NULL) THEN RAISE EXCEPTION 'Invalid cost'; END IF;
  IF p_block OR p_cost > usage.reserved_micro_usd THEN UPDATE public.yo_speech_budget SET blocked = true WHERE id; END IF;
  UPDATE public.yo_speech_usage SET state = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    actual_micro_usd = p_cost, finished_at = clock_timestamp() WHERE user_id = p_user_id AND request_id = p_request_id;
  IF p_success AND p_correction IS NOT NULL AND usage.remember_corrections THEN
    INSERT INTO public.yo_error_events(user_id, id, language, locale, target, hint, srs, due_at)
      VALUES (p_user_id, p_request_id, usage.language, p_correction->>'locale', p_correction->>'target',
        p_correction->>'hint', p_correction->'srs', (p_correction->>'dueAt')::bigint);
    RETURN 'saved';
  END IF;
  RETURN 'finished';
END;
$$;

CREATE OR REPLACE FUNCTION public.yo_speech_review(
  p_user_id uuid, p_item_id uuid, p_attempt_id uuid, p_revision bigint, p_state jsonb
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE item public.yo_error_events%ROWTYPE;
BEGIN
  IF NOT public.yo_speech_account_available(p_user_id) THEN RETURN 'unavailable'; END IF;
  SELECT * INTO item FROM public.yo_error_events WHERE user_id = p_user_id AND id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.yo_speech_review_receipts WHERE user_id = p_user_id AND attempt_id = p_attempt_id) THEN RETURN 'duplicate'; END IF;
  IF item.revision <> p_revision THEN RETURN 'conflict'; END IF;
  INSERT INTO public.yo_speech_review_receipts(user_id, attempt_id, item_id) VALUES (p_user_id, p_attempt_id, p_item_id);
  UPDATE public.yo_error_events SET srs = p_state, due_at = (p_state->>'nextReviewAt')::bigint,
    revision = revision + 1 WHERE user_id = p_user_id AND id = p_item_id;
  RETURN 'reviewed';
END;
$$;

REVOKE ALL ON FUNCTION public.yo_speech_account_available(uuid), public.yo_speech_status(uuid), public.yo_speech_reserve(uuid,uuid,text,text,text,boolean), public.yo_speech_finish(uuid,uuid,boolean,bigint,jsonb,boolean), public.yo_speech_review(uuid,uuid,uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yo_speech_account_available(uuid), public.yo_speech_status(uuid), public.yo_speech_reserve(uuid,uuid,text,text,text,boolean), public.yo_speech_finish(uuid,uuid,boolean,bigint,jsonb,boolean), public.yo_speech_review(uuid,uuid,uuid,bigint,jsonb) TO service_role;
COMMENT ON TABLE public.yo_speech_budget IS 'USD micro-units. Hard pilot cap $10; each turn irreversibly reserves $0.20, including failures. No automatic reset/refund.';
COMMENT ON TABLE public.yo_error_events IS 'Optional derived phrase and shared-engine SRS state. No recording, complete transcript, pronunciation score, XP or paid Pass entitlement.';
COMMIT;
