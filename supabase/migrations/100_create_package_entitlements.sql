-- 100: package purchase entitlement foundation (PR 10A)
--
-- When a learner pays for a booking whose offer snapshot type is `package`,
-- the server creates one immutable entitlement representing the purchased
-- forfait. Session redemption is a later PR (10B). This migration does not
-- decrement credits, create redemption rows, or backfill existing bookings.
--
-- Product naming:
--   FR: Forfait (offer type package only)
--   EN: Package
--   ES: Paquete
--   Internal: public.package_entitlements
--
-- Snapshot source of truth: bookings.teacher_offer_* columns.
-- Do not read live teacher_offers to populate historical entitlements.

CREATE TABLE IF NOT EXISTS public.package_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.booking_payments (id) ON DELETE SET NULL,
  teacher_offer_id uuid REFERENCES public.teacher_offers (id) ON DELETE SET NULL,

  offer_title_snapshot text NOT NULL,
  offer_type_snapshot text NOT NULL,
  offer_format_snapshot text NOT NULL,
  offer_price_cents_snapshot integer NOT NULL,
  offer_currency_snapshot text NOT NULL DEFAULT 'CAD',
  offer_duration_minutes_snapshot integer,
  offer_session_count_snapshot integer NOT NULL,
  offer_discipline_id_snapshot text,
  offer_specialite_snapshot text,
  offer_short_description_snapshot text,
  offer_snapshot_version integer,

  total_sessions integer NOT NULL,
  used_sessions integer NOT NULL DEFAULT 0,
  remaining_sessions integer NOT NULL,

  status text NOT NULL DEFAULT 'active',

  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT package_entitlements_offer_type_chk
    CHECK (offer_type_snapshot = 'package'),
  CONSTRAINT package_entitlements_title_chk
    CHECK (char_length(btrim(offer_title_snapshot)) >= 1),
  CONSTRAINT package_entitlements_price_chk
    CHECK (offer_price_cents_snapshot >= 0),
  CONSTRAINT package_entitlements_currency_chk
    CHECK (offer_currency_snapshot = 'CAD'),
  CONSTRAINT package_entitlements_session_count_chk
    CHECK (offer_session_count_snapshot >= 1),
  CONSTRAINT package_entitlements_total_sessions_chk
    CHECK (total_sessions >= 1),
  CONSTRAINT package_entitlements_used_sessions_chk
    CHECK (used_sessions >= 0),
  CONSTRAINT package_entitlements_remaining_sessions_chk
    CHECK (remaining_sessions >= 0),
  CONSTRAINT package_entitlements_session_balance_chk
    CHECK (used_sessions + remaining_sessions = total_sessions),
  CONSTRAINT package_entitlements_status_chk
    CHECK (status IN ('active', 'fully_used', 'cancelled', 'refunded')),
  CONSTRAINT package_entitlements_booking_unique UNIQUE (booking_id)
);

COMMENT ON TABLE public.package_entitlements IS
  'Server-owned forfait (package) purchase entitlements created after successful payment. Snapshot fields are copied from bookings at purchase time. Redemption of remaining_sessions is not implemented in this migration.';

COMMENT ON COLUMN public.package_entitlements.used_sessions IS
  'Sessions already redeemed. Always 0 in PR 10A. Learners and teachers cannot update this column.';

COMMENT ON COLUMN public.package_entitlements.remaining_sessions IS
  'Sessions still available. Equals total_sessions at purchase. Redemption (PR 10B) will decrement this server-side only.';

CREATE INDEX IF NOT EXISTS idx_package_entitlements_student_id
  ON public.package_entitlements (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_entitlements_teacher_id
  ON public.package_entitlements (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_package_entitlements_status
  ON public.package_entitlements (status);

CREATE OR REPLACE FUNCTION public.package_entitlements_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_package_entitlements_set_updated_at ON public.package_entitlements;
CREATE TRIGGER trg_package_entitlements_set_updated_at
  BEFORE UPDATE ON public.package_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.package_entitlements_set_updated_at();

-- RLS: students/teachers read own rows; authenticated clients cannot write.
ALTER TABLE public.package_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "package_entitlements_select_student" ON public.package_entitlements;
CREATE POLICY "package_entitlements_select_student"
  ON public.package_entitlements FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "package_entitlements_select_teacher" ON public.package_entitlements;
CREATE POLICY "package_entitlements_select_teacher"
  ON public.package_entitlements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = package_entitlements.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "package_entitlements_no_client_insert" ON public.package_entitlements;
CREATE POLICY "package_entitlements_no_client_insert"
  ON public.package_entitlements FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "package_entitlements_no_client_update" ON public.package_entitlements;
CREATE POLICY "package_entitlements_no_client_update"
  ON public.package_entitlements FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "package_entitlements_no_client_delete" ON public.package_entitlements;
CREATE POLICY "package_entitlements_no_client_delete"
  ON public.package_entitlements FOR DELETE
  TO authenticated
  USING (false);

REVOKE ALL ON TABLE public.package_entitlements FROM anon;
GRANT SELECT ON TABLE public.package_entitlements TO authenticated;
GRANT ALL ON TABLE public.package_entitlements TO service_role;
