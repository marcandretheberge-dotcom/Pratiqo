-- 099: booking-time teacher offer snapshots
--
-- Copies published teacher_offers fields onto bookings at creation time.
-- Snapshots are immutable historical copies. Later edits to teacher_offers
-- must not rewrite these columns.
--
-- Non-goals:
--   * Stripe / checkout charging from snapshot price (PR 8)
--   * commission / refund / payout changes
--   * backfill of existing bookings
--   * making teacher_offer_id required
--
-- Booking offer snapshots are immutable booking-time copies.
-- Later edits to teacher_offers must not rewrite historical bookings.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS teacher_offer_id uuid
    REFERENCES public.teacher_offers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_offer_title_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_type_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_format_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_price_cents_snapshot integer,
  ADD COLUMN IF NOT EXISTS teacher_offer_currency_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_duration_minutes_snapshot integer,
  ADD COLUMN IF NOT EXISTS teacher_offer_session_count_snapshot integer,
  ADD COLUMN IF NOT EXISTS teacher_offer_discipline_id_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_specialite_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_short_description_snapshot text,
  ADD COLUMN IF NOT EXISTS teacher_offer_snapshot_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_price_cents_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_price_cents_snapshot_chk
  CHECK (
    teacher_offer_price_cents_snapshot IS NULL
    OR teacher_offer_price_cents_snapshot >= 0
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_currency_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_currency_snapshot_chk
  CHECK (
    teacher_offer_currency_snapshot IS NULL
    OR teacher_offer_currency_snapshot = 'CAD'
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_duration_minutes_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_duration_minutes_snapshot_chk
  CHECK (
    teacher_offer_duration_minutes_snapshot IS NULL
    OR teacher_offer_duration_minutes_snapshot BETWEEN 15 AND 480
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_session_count_snapshot_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_session_count_snapshot_chk
  CHECK (
    teacher_offer_session_count_snapshot IS NULL
    OR teacher_offer_session_count_snapshot >= 1
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_teacher_offer_snapshot_version_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_teacher_offer_snapshot_version_chk
  CHECK (teacher_offer_snapshot_version >= 1);

CREATE INDEX IF NOT EXISTS idx_bookings_teacher_offer_id
  ON public.bookings (teacher_offer_id)
  WHERE teacher_offer_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.teacher_offer_id IS
  'Optional published teacher_offers.id selected at booking time. Nullable for legacy bookings. Not used for live Stripe charge calculation until a later checkout PR.';

COMMENT ON COLUMN public.bookings.teacher_offer_title_snapshot IS
  'Immutable booking-time copy of teacher_offers.title. Not rewritten when the offer is later edited.';

COMMENT ON COLUMN public.bookings.teacher_offer_price_cents_snapshot IS
  'Immutable booking-time copy of teacher_offers.price_cents. Checkout still uses legacy teacher pricing until PR 8.';

COMMENT ON COLUMN public.bookings.teacher_offer_snapshot_version IS
  'Snapshot shape version. Default 1. Existing bookings keep default without an offer.';

-- Authenticated clients cannot write or mutate snapshot columns (or attach
-- teacher_offer_id). Only service-role server paths may set them.
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
    NEW.teacher_offer_snapshot_version := OLD.teacher_offer_snapshot_version;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_preserve_offer_snapshot_fields ON public.bookings;
CREATE TRIGGER trg_bookings_preserve_offer_snapshot_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_preserve_offer_snapshot_fields();
