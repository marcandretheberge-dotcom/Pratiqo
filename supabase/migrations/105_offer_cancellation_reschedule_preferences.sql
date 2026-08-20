-- 105: teacher-configurable cancellation / rescheduling preferences (PR 16A)
--
-- Preference capture + booking snapshot foundation only.
-- Does NOT change payment flows or package credit balance mutations.
-- Enforcement belongs in PR 16B.
--
-- Framing: teacher-defined offer terms within Pratiqo marketplace safety rules.
-- See docs/product/marketplace-independent-teacher-guardrails.md.
--
-- Presets:
--   flexible      → learner may cancel/reschedule until 12h before
--   standard      → until 24h before (platform default)
--   strict        → until 48h before
--   manual_review → handled by agreement with the teacher

ALTER TABLE public.teacher_offers
  ADD COLUMN IF NOT EXISTS cancellation_preference text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS reschedule_preference text NOT NULL DEFAULT 'standard';

ALTER TABLE public.teacher_offers
  DROP CONSTRAINT IF EXISTS teacher_offers_cancellation_preference_chk;
ALTER TABLE public.teacher_offers
  ADD CONSTRAINT teacher_offers_cancellation_preference_chk
  CHECK (
    cancellation_preference IN ('flexible', 'standard', 'strict', 'manual_review')
  );

ALTER TABLE public.teacher_offers
  DROP CONSTRAINT IF EXISTS teacher_offers_reschedule_preference_chk;
ALTER TABLE public.teacher_offers
  ADD CONSTRAINT teacher_offers_reschedule_preference_chk
  CHECK (
    reschedule_preference IN ('flexible', 'standard', 'strict', 'manual_review')
  );

COMMENT ON COLUMN public.teacher_offers.cancellation_preference IS
  'Teacher-defined cancellation preference for this offer. Not enforced until PR 16B.';

COMMENT ON COLUMN public.teacher_offers.reschedule_preference IS
  'Teacher-defined rescheduling preference for this offer. Not enforced until PR 16B.';

-- Immutable booking-time copies of the prefs that applied when the booking was created.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS teacher_offer_cancellation_preference_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_reschedule_preference_snapshot text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_cancellation_preference_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_cancellation_preference_snapshot_chk
  CHECK (
    teacher_offer_cancellation_preference_snapshot IS NULL
    OR teacher_offer_cancellation_preference_snapshot IN (
      'flexible', 'standard', 'strict', 'manual_review'
    )
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_reschedule_preference_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_reschedule_preference_snapshot_chk
  CHECK (
    teacher_offer_reschedule_preference_snapshot IS NULL
    OR teacher_offer_reschedule_preference_snapshot IN (
      'flexible', 'standard', 'strict', 'manual_review'
    )
  );

COMMENT ON COLUMN public.bookings.teacher_offer_cancellation_preference_snapshot IS
  'Immutable booking-time copy of teacher_offers.cancellation_preference. Not rewritten when the offer is later edited.';

COMMENT ON COLUMN public.bookings.teacher_offer_reschedule_preference_snapshot IS
  'Immutable booking-time copy of teacher_offers.reschedule_preference. Not rewritten when the offer is later edited.';

-- Authenticated clients cannot write or mutate snapshot columns.
CREATE OR REPLACE FUNCTION public.bookings_preserve_offer_snapshot_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.teacher_offer_id := NULL;
    NEW.teacher_offer_title_snapshot := NULL;
    NEW.teacher_offer_type_snapshot := NULL;
    NEW.teacher_offer_format_snapshot := NULL;
    NEW.teacher_offer_price_cents_snapshot := NULL;
    NEW.teacher_offer_currency_snapshot := NULL;
    NEW.teacher_offer_duration_minutes_snapshot := NULL;
    NEW.teacher_offer_session_count_snapshot := NULL;
    NEW.teacher_offer_discipline_id_snapshot := NULL;
    NEW.teacher_offer_specialite_snapshot := NULL;
    NEW.teacher_offer_short_description_snapshot := NULL;
    NEW.teacher_offer_cancellation_preference_snapshot := NULL;
    NEW.teacher_offer_reschedule_preference_snapshot := NULL;
    NEW.teacher_offer_snapshot_version := 1;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.teacher_offer_id := OLD.teacher_offer_id;
    NEW.teacher_offer_title_snapshot := OLD.teacher_offer_title_snapshot;
    NEW.teacher_offer_type_snapshot := OLD.teacher_offer_type_snapshot;
    NEW.teacher_offer_format_snapshot := OLD.teacher_offer_format_snapshot;
    NEW.teacher_offer_price_cents_snapshot := OLD.teacher_offer_price_cents_snapshot;
    NEW.teacher_offer_currency_snapshot := OLD.teacher_offer_currency_snapshot;
    NEW.teacher_offer_duration_minutes_snapshot := OLD.teacher_offer_duration_minutes_snapshot;
    NEW.teacher_offer_session_count_snapshot := OLD.teacher_offer_session_count_snapshot;
    NEW.teacher_offer_discipline_id_snapshot := OLD.teacher_offer_discipline_id_snapshot;
    NEW.teacher_offer_specialite_snapshot := OLD.teacher_offer_specialite_snapshot;
    NEW.teacher_offer_short_description_snapshot := OLD.teacher_offer_short_description_snapshot;
    NEW.teacher_offer_cancellation_preference_snapshot := OLD.teacher_offer_cancellation_preference_snapshot;
    NEW.teacher_offer_reschedule_preference_snapshot := OLD.teacher_offer_reschedule_preference_snapshot;
    NEW.teacher_offer_snapshot_version := OLD.teacher_offer_snapshot_version;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
