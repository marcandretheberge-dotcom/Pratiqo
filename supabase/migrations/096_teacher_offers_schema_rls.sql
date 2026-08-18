-- 096: teacher_offers schema + RLS
--
-- Product naming (founder decision):
--   Student-facing FR: Offres de cours
--   Teacher-facing FR: Mes offres de cours
--   Short nav later: Offres
--   EN: Course offers / Offers
--   ES: Ofertas de cursos / Ofertas
--   Internal table: public.teacher_offers
--
-- Scope:
--   * create the catalog table for one teacher profile = multiple offers
--   * RLS: teacher owners CRUD their own rows; public reads published
--     offers of search-visible teachers only
--
-- Non-goals (later PRs):
--   * UI / Mes offres de cours dashboard
--   * booking.teacher_offer_id + snapshots
--   * Stripe checkout using offer price
--   * backfill from teachers.price_per_lesson / intro_session_*
--   * offer count gating (free = 3 published, founder = 10)
--   * teacher_offer_sections (group classes / workshops = Phase 11)
--
-- Legacy fallback (do not drop in this migration):
--   teachers.price_per_lesson
--   teachers.default_lesson_duration_minutes
--   teachers.intro_session_*
--
-- discipline_id is app-taxonomy text (lib/taxonomy/disciplines.ts
-- PRATIQO_DISCIPLINES.id), not a display label. There is no DB discipline
-- reference table to FK against.
--
-- Currency: Stripe/checkout charge currency is CAD. Display FX (USD/UYU/…)
-- is not a stored offer currency. USD/UYU require a later payment PR.

CREATE TABLE IF NOT EXISTS public.teacher_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,

  title text NOT NULL,
  slug text,
  description text,
  short_description text,

  discipline_id text,
  specialite text,

  offer_type text NOT NULL,
  format text NOT NULL,
  status text NOT NULL DEFAULT 'draft',

  image_url text,

  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  duration_minutes integer,
  session_count integer,

  capacity_min integer,
  capacity_max integer,

  level text,
  age_min integer,
  age_max integer,

  location_mode text,
  requires_identity boolean NOT NULL DEFAULT false,
  requires_manual_confirmation boolean NOT NULL DEFAULT false,

  published_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT teacher_offers_title_length_chk
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT teacher_offers_slug_format_chk
    CHECK (
      slug IS NULL
      OR (
        char_length(slug) BETWEEN 1 AND 160
        AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      )
    ),
  CONSTRAINT teacher_offers_short_description_length_chk
    CHECK (short_description IS NULL OR char_length(short_description) <= 220),
  CONSTRAINT teacher_offers_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 5000),
  CONSTRAINT teacher_offers_specialite_length_chk
    CHECK (specialite IS NULL OR char_length(specialite) <= 120),
  CONSTRAINT teacher_offers_level_length_chk
    CHECK (level IS NULL OR char_length(level) <= 80),
  CONSTRAINT teacher_offers_image_url_length_chk
    CHECK (image_url IS NULL OR char_length(image_url) BETWEEN 1 AND 2000),
  CONSTRAINT teacher_offers_discipline_id_format_chk
    CHECK (
      discipline_id IS NULL
      OR (
        char_length(discipline_id) BETWEEN 1 AND 80
        AND discipline_id ~ '^[a-z0-9_]+$'
      )
    ),
  CONSTRAINT teacher_offers_offer_type_chk
    CHECK (offer_type IN (
      'private_lesson',
      'intro_session',
      'package',
      'assessment',
      'workshop',
      'group_class',
      'cohort',
      'self_paced_bridge'
    )),
  CONSTRAINT teacher_offers_format_chk
    CHECK (format IN ('online', 'in_person', 'home', 'hybrid')),
  CONSTRAINT teacher_offers_status_chk
    CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  CONSTRAINT teacher_offers_location_mode_chk
    CHECK (
      location_mode IS NULL
      OR location_mode IN ('online', 'in_person', 'home', 'hybrid')
    ),
  CONSTRAINT teacher_offers_currency_chk
    CHECK (currency = 'CAD'),
  CONSTRAINT teacher_offers_price_cents_chk
    CHECK (price_cents >= 0),
  CONSTRAINT teacher_offers_duration_minutes_chk
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT teacher_offers_session_count_chk
    CHECK (session_count IS NULL OR session_count BETWEEN 1 AND 52),
  CONSTRAINT teacher_offers_capacity_min_chk
    CHECK (capacity_min IS NULL OR capacity_min >= 1),
  CONSTRAINT teacher_offers_capacity_max_chk
    CHECK (capacity_max IS NULL OR capacity_max >= 1),
  CONSTRAINT teacher_offers_capacity_range_chk
    CHECK (capacity_min IS NULL OR capacity_max IS NULL OR capacity_max >= capacity_min),
  CONSTRAINT teacher_offers_age_min_chk
    CHECK (age_min IS NULL OR age_min BETWEEN 0 AND 120),
  CONSTRAINT teacher_offers_age_max_chk
    CHECK (age_max IS NULL OR age_max BETWEEN 0 AND 120),
  CONSTRAINT teacher_offers_age_range_chk
    CHECK (age_min IS NULL OR age_max IS NULL OR age_max >= age_min)
);

COMMENT ON TABLE public.teacher_offers IS
  'Structured course offers (Offres de cours / Mes offres de cours). One teacher profile may have many offers. Group-class sections (teacher_offer_sections) are deferred to Phase 11. No backfill of legacy teacher prices in this migration.';

COMMENT ON COLUMN public.teacher_offers.teacher_id IS
  'FK to public.teachers.id (text UUID-shaped ids). Ownership for RLS is teachers.user_id = auth.uid(), not created_by.';

COMMENT ON COLUMN public.teacher_offers.created_by IS
  'Optional profiles.id of the teacher account that created the row. Not used as the RLS ownership key.';

COMMENT ON COLUMN public.teacher_offers.discipline_id IS
  'Must match a PRATIQO_DISCIPLINES id from lib/taxonomy/disciplines.ts (snake_case ascii). Do not store FR/EN/ES display labels.';

COMMENT ON COLUMN public.teacher_offers.offer_type IS
  'MVP uses private_lesson, intro_session, package, assessment. workshop/group_class/cohort/self_paced_bridge are schema-ready for later phases. package is a forfait (multi-session bundle), not a social post.';

COMMENT ON COLUMN public.teacher_offers.currency IS
  'Charge currency. CAD only until a dedicated payment/currency PR adds other Stripe charge currencies.';

COMMENT ON COLUMN public.teacher_offers.price_cents IS
  'Integer minor units in currency. App-layer minimum lesson price still applies later; drafts may be 0.';

COMMENT ON COLUMN public.teacher_offers.status IS
  'draft/published/paused/archived. published_at/paused_at/archived_at are set by later publish logic; they are nullable so draft flows stay simple.';

COMMENT ON COLUMN public.teacher_offers.slug IS
  'Optional per-teacher URL slug. Unique only with teacher_id when not null. Lowercase kebab-case.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_offers_teacher_id
  ON public.teacher_offers (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_created_by
  ON public.teacher_offers (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_offers_status
  ON public.teacher_offers (status);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_offer_type
  ON public.teacher_offers (offer_type);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_discipline_id
  ON public.teacher_offers (discipline_id)
  WHERE discipline_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_offers_format
  ON public.teacher_offers (format);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_currency
  ON public.teacher_offers (currency);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_published_at
  ON public.teacher_offers (published_at DESC)
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_offers_teacher_status
  ON public.teacher_offers (teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_teacher_status_published
  ON public.teacher_offers (teacher_id, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_offers_published_catalog
  ON public.teacher_offers (status, discipline_id, offer_type, format, published_at DESC)
  WHERE status = 'published' AND published_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_offers_teacher_slug
  ON public.teacher_offers (teacher_id, slug)
  WHERE slug IS NOT NULL;

-- updated_at
CREATE OR REPLACE FUNCTION public.teacher_offers_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_offers_set_updated_at ON public.teacher_offers;
CREATE TRIGGER trg_teacher_offers_set_updated_at
  BEFORE UPDATE ON public.teacher_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.teacher_offers_set_updated_at();

-- RLS
ALTER TABLE public.teacher_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_offers_select_own" ON public.teacher_offers;
CREATE POLICY "teacher_offers_select_own"
  ON public.teacher_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_offers.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_offers_insert_own" ON public.teacher_offers;
CREATE POLICY "teacher_offers_insert_own"
  ON public.teacher_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_offers.teacher_id
        AND t.user_id = auth.uid()
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "teacher_offers_update_own" ON public.teacher_offers;
CREATE POLICY "teacher_offers_update_own"
  ON public.teacher_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_offers.teacher_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_offers.teacher_id
        AND t.user_id = auth.uid()
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "teacher_offers_delete_own" ON public.teacher_offers;
CREATE POLICY "teacher_offers_delete_own"
  ON public.teacher_offers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_offers.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_offers_select_published_public" ON public.teacher_offers;
CREATE POLICY "teacher_offers_select_published_public"
  ON public.teacher_offers FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.teachers_public tp
      WHERE tp.id = teacher_offers.teacher_id
    )
  );

COMMENT ON POLICY "teacher_offers_select_own" ON public.teacher_offers IS
  'Authenticated teachers can read every status of their own offers via teachers.user_id = auth.uid().';
COMMENT ON POLICY "teacher_offers_insert_own" ON public.teacher_offers IS
  'Teachers may insert offers only for the teacher row they own.';
COMMENT ON POLICY "teacher_offers_update_own" ON public.teacher_offers IS
  'Teachers may update only their own offers.';
COMMENT ON POLICY "teacher_offers_delete_own" ON public.teacher_offers IS
  'Teachers may delete only their own offers.';
COMMENT ON POLICY "teacher_offers_select_published_public" ON public.teacher_offers IS
  'Anon/authenticated readers see only published offers (published_at set) of teachers visible in public.teachers_public (search-visible, not demo/deleted/deactivated). Draft/paused/archived stay private.';

REVOKE ALL ON TABLE public.teacher_offers FROM PUBLIC;
GRANT SELECT ON TABLE public.teacher_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teacher_offers TO authenticated;
GRANT ALL ON TABLE public.teacher_offers TO service_role;
