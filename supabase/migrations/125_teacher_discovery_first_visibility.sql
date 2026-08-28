-- =============================================================================
-- 125_teacher_discovery_first_visibility.sql
--
-- Teacher discovery first:
--   * marketplace discovery requires a live teacher profile and at least one
--     discipline signal;
--   * publication flags, full bio, price, location, availability, and payment
--     setup are readiness/profile-quality signals, not search visibility gates.
--
-- SEO indexability remains separate. This migration does not expose Stripe
-- Connect internals, private location, diploma URLs, or manual identity source.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learner_profile_id uuid NULL REFERENCES public.learner_profiles(id) ON DELETE SET NULL,
  requested_slot_date date NULL,
  requested_time_slot text NULL,
  teaching_mode text NULL,
  lesson_type text NULL,
  duration_minutes integer NULL,
  student_level text NULL,
  status text NOT NULL DEFAULT 'pending_teacher_payment_setup'
    CHECK (status IN ('pending_teacher_payment_setup', 'teacher_payment_ready', 'closed')),
  email_sent_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teacher_booking_requests IS
  'No-payment learner interest requests for discovery-visible teachers who are not yet ready for paid Stripe checkout. Does not reserve a slot or create financial liability.';

CREATE INDEX IF NOT EXISTS idx_teacher_booking_requests_teacher
  ON public.teacher_booking_requests (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_booking_requests_student
  ON public.teacher_booking_requests (student_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_booking_requests_open_unique
  ON public.teacher_booking_requests (
    teacher_id,
    student_id,
    COALESCE(learner_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(requested_slot_date, '1900-01-01'::date),
    COALESCE(requested_time_slot, ''),
    COALESCE(lesson_type, '')
  )
  WHERE status IN ('pending_teacher_payment_setup', 'teacher_payment_ready');

ALTER TABLE IF EXISTS public.teacher_booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_booking_requests_select_participants" ON public.teacher_booking_requests;
CREATE POLICY "teacher_booking_requests_select_participants"
  ON public.teacher_booking_requests FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_booking_requests.teacher_id
        AND t.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.teacher_booking_requests FROM PUBLIC;
GRANT SELECT ON public.teacher_booking_requests TO authenticated;
GRANT ALL ON public.teacher_booking_requests TO service_role;

DROP POLICY IF EXISTS "teacher_offers_select_published_public" ON public.teacher_offers;
DROP VIEW IF EXISTS public.teachers_public;
DROP FUNCTION IF EXISTS public.list_public_teachers();

CREATE FUNCTION public.list_public_teachers()
RETURNS TABLE (
  id                                  text,
  user_id                             uuid,
  name                                text,
  discipline                          text,
  category                            text,
  rating                              double precision,
  reviews                             integer,
  price_per_lesson                    numeric,
  monthly_subscription                numeric,
  bio                                 text,
  image_url                           text,
  profile_photo_url                   text,
  availability                        jsonb,
  location                            jsonb,
  is_verified                         boolean,
  teaching_mode                       text,
  languages                           text[],
  levels                              text[],
  created_at                          timestamptz,
  updated_at                          timestamptz,
  home_lesson_enabled                 boolean,
  home_lesson_price                   numeric,
  home_lesson_radius_km               integer,
  home_lesson_min_duration            integer,
  home_lesson_requires_confirmation   boolean,
  home_lesson_force_2h_over_20km      boolean,
  default_lesson_duration_minutes     integer,
  available_from_date                 date,
  verification_level                  integer,
  identity_verified                   boolean,
  diploma_verified                    boolean,
  verified_experience_active          boolean,
  video_url                           text,
  country_code                        text,
  timezone                            text,
  currency                            text,
  city                                text,
  region                              text,
  cv_summary                          text,
  intro_session_enabled               boolean,
  intro_session_duration_minutes      integer,
  intro_session_price_cents           integer,
  intro_session_discount_percent      integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.user_id,
    COALESCE(NULLIF(BTRIM(t.name), ''), 'Professeur Pratiqo') AS name,
    t.discipline,
    t.category,
    t.rating,
    t.reviews,
    t.price_per_lesson,
    t.monthly_subscription,
    COALESCE(t.bio, '') AS bio,
    t.image_url,
    CASE
      WHEN p.id IS NOT NULL
        AND COALESCE(p.is_active, true) = true
        AND p.deactivated_at IS NULL
        AND p.deleted_at IS NULL
        AND p.anonymized_at IS NULL
        AND NULLIF(BTRIM(p.photo_url), '') IS NOT NULL
      THEN BTRIM(p.photo_url)
      ELSE NULL
    END AS profile_photo_url,
    COALESCE(t.availability, '[]'::jsonb) AS availability,
    COALESCE(t.location, '{}'::jsonb) - 'private'::text AS location,
    t.is_verified,
    COALESCE(t.teaching_mode, '') AS teaching_mode,
    t.languages,
    t.levels,
    t.created_at,
    t.updated_at,
    t.home_lesson_enabled,
    t.home_lesson_price,
    t.home_lesson_radius_km,
    t.home_lesson_min_duration,
    t.home_lesson_requires_confirmation,
    t.home_lesson_force_2h_over_20km,
    t.default_lesson_duration_minutes,
    t.available_from_date,
    t.verification_level,
    (
      COALESCE(t.identity_verified, false)
      OR COALESCE(t.identity_verified_manually, false)
    ) AS identity_verified,
    t.diploma_verified,
    t.verified_experience_active,
    t.video_url,
    t.country_code,
    t.timezone,
    t.currency,
    t.city,
    t.region,
    t.cv_summary,
    t.intro_session_enabled,
    t.intro_session_duration_minutes,
    t.intro_session_price_cents,
    t.intro_session_discount_percent
  FROM public.teachers t
  INNER JOIN public.profiles p ON p.id = t.user_id
  WHERE t.deactivated_at IS NULL
    AND t.deleted_at IS NULL
    AND (
      COALESCE(t.identity_status, 'none') <> 'failed'
      OR t.identity_verified_manually = true
    )
    AND (
      t.identity_verified = true
      OR t.identity_verified_manually = true
      OR NULLIF(BTRIM(COALESCE(t.stripe_identity_failed_reason, '')), '') IS NULL
    )
    AND COALESCE(t.is_demo, false) = false
    AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND t.user_id IS NOT NULL
    AND COALESCE(p.is_active, true) = true
    AND p.role = 'teacher'
    AND p.deactivated_at IS NULL
    AND p.deleted_at IS NULL
    AND p.anonymized_at IS NULL
    AND (
      NULLIF(BTRIM(COALESCE(t.discipline, '')), '') IS NOT NULL
      OR NULLIF(BTRIM(COALESCE(t.category, '')), '') IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM public.teacher_disciplines td
        WHERE td.teacher_id = t.id
      )
    );
$$;

REVOKE ALL ON FUNCTION public.list_public_teachers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO service_role;

COMMENT ON FUNCTION public.list_public_teachers() IS
  '125: marketplace discovery first. Requires active teacher/profile + discipline only; profile publication, bio, price, location, availability, and payment setup are not discovery gates.';

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT * FROM public.list_public_teachers();

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;

COMMENT ON VIEW public.teachers_public IS
  '125: discovery-first public marketplace projection. Private location and sensitive payment/identity source fields stay off-projection.';

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

COMMENT ON POLICY "teacher_offers_select_published_public" ON public.teacher_offers IS
  'Restored by 125 after teachers_public rebuild. Public readers see published offers for discovery-visible teachers.';
