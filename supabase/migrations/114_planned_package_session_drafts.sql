-- 114: planned package session drafts (Phase 1 scheduling draft — no payment)
--
-- Learners may select N sessions for a planned package offer behind feature flags.
-- This does NOT create bookings, entitlements, redemptions, Stripe charges, or holds.
-- Future checkout PR must revalidate all selected slots before payment.
--
-- Product: Forfait planifié / forfait proposé par le professeur.
-- Not a generic Pratiqo credit bank.

CREATE TABLE IF NOT EXISTS public.planned_package_session_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  teacher_offer_id uuid NOT NULL REFERENCES public.teacher_offers (id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'draft',

  session_count integer NOT NULL,
  duration_minutes integer NOT NULL,

  price_cents_snapshot integer NOT NULL,
  currency_snapshot text NOT NULL DEFAULT 'CAD',
  title_snapshot text NOT NULL,
  offer_type_snapshot text NOT NULL DEFAULT 'package',

  expires_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_session_drafts_status_chk
    CHECK (status IN ('draft', 'expired', 'cancelled', 'converted')),
  CONSTRAINT planned_package_session_drafts_session_count_chk
    CHECK (session_count BETWEEN 2 AND 52),
  CONSTRAINT planned_package_session_drafts_duration_chk
    CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT planned_package_session_drafts_price_chk
    CHECK (price_cents_snapshot >= 0),
  CONSTRAINT planned_package_session_drafts_currency_chk
    CHECK (currency_snapshot = 'CAD'),
  CONSTRAINT planned_package_session_drafts_title_chk
    CHECK (char_length(btrim(title_snapshot)) >= 1),
  CONSTRAINT planned_package_session_drafts_offer_type_chk
    CHECK (offer_type_snapshot = 'package')
);

CREATE TABLE IF NOT EXISTS public.planned_package_session_draft_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  draft_id uuid NOT NULL
    REFERENCES public.planned_package_session_drafts (id) ON DELETE CASCADE,

  session_index integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,

  availability_source text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_session_draft_items_index_chk
    CHECK (session_index >= 1),
  CONSTRAINT planned_package_session_draft_items_range_chk
    CHECK (starts_at < ends_at),
  CONSTRAINT planned_package_session_draft_items_unique_index
    UNIQUE (draft_id, session_index)
);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_drafts_student
  ON public.planned_package_session_drafts (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_drafts_teacher
  ON public.planned_package_session_drafts (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_drafts_offer
  ON public.planned_package_session_drafts (teacher_offer_id);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_draft_items_draft
  ON public.planned_package_session_draft_items (draft_id, session_index);

COMMENT ON TABLE public.planned_package_session_drafts IS
  'Draft session plans for planned packages. No bookings, entitlements, Stripe, or permanent holds. Revalidate before payment.';

COMMENT ON TABLE public.planned_package_session_draft_items IS
  'Selected session times for a planned package draft. Not confirmed reservations.';

CREATE OR REPLACE FUNCTION public.planned_package_session_drafts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_session_drafts_updated_at
  ON public.planned_package_session_drafts;
CREATE TRIGGER trg_planned_package_session_drafts_updated_at
  BEFORE UPDATE ON public.planned_package_session_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_session_drafts_set_updated_at();

CREATE OR REPLACE FUNCTION public.planned_package_session_draft_items_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_session_draft_items_updated_at
  ON public.planned_package_session_draft_items;
CREATE TRIGGER trg_planned_package_session_draft_items_updated_at
  BEFORE UPDATE ON public.planned_package_session_draft_items
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_session_draft_items_set_updated_at();

ALTER TABLE IF EXISTS public.planned_package_session_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planned_package_session_draft_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planned_package_session_drafts_select_own"
  ON public.planned_package_session_drafts;
CREATE POLICY "planned_package_session_drafts_select_own"
  ON public.planned_package_session_drafts FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "planned_package_session_drafts_select_teacher"
  ON public.planned_package_session_drafts;
CREATE POLICY "planned_package_session_drafts_select_teacher"
  ON public.planned_package_session_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = planned_package_session_drafts.teacher_id
        AND t.user_id = auth.uid()
    )
  );

-- Mutations go through service-role server routes only.
DROP POLICY IF EXISTS "planned_package_session_draft_items_select_own"
  ON public.planned_package_session_draft_items;
CREATE POLICY "planned_package_session_draft_items_select_own"
  ON public.planned_package_session_draft_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.planned_package_session_drafts d
      WHERE d.id = planned_package_session_draft_items.draft_id
        AND d.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "planned_package_session_draft_items_select_teacher"
  ON public.planned_package_session_draft_items;
CREATE POLICY "planned_package_session_draft_items_select_teacher"
  ON public.planned_package_session_draft_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.planned_package_session_drafts d
      JOIN public.teachers t ON t.id = d.teacher_id
      WHERE d.id = planned_package_session_draft_items.draft_id
        AND t.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.planned_package_session_drafts FROM PUBLIC;
REVOKE ALL ON TABLE public.planned_package_session_draft_items FROM PUBLIC;
GRANT SELECT ON TABLE public.planned_package_session_drafts TO authenticated;
GRANT SELECT ON TABLE public.planned_package_session_draft_items TO authenticated;
GRANT ALL ON TABLE public.planned_package_session_drafts TO service_role;
GRANT ALL ON TABLE public.planned_package_session_draft_items TO service_role;
