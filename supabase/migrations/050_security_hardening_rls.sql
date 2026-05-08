-- Security hardening pass (Phase 1).
-- Goal: close common RLS leaks / overly-permissive demo policies without redesigning the app.

-- ---------------------------------------------------------------------------
-- WAITLIST: contains emails → must have RLS and no client reads
-- ---------------------------------------------------------------------------
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
CREATE POLICY "waitlist_insert"
  ON public.waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) >= 3
  );

DROP POLICY IF EXISTS "waitlist_select_none" ON public.waitlist;
CREATE POLICY "waitlist_select_none"
  ON public.waitlist FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "waitlist_update_none" ON public.waitlist;
CREATE POLICY "waitlist_update_none"
  ON public.waitlist FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "waitlist_delete_none" ON public.waitlist;
CREATE POLICY "waitlist_delete_none"
  ON public.waitlist FOR DELETE
  TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- TEACHERS_PUBLIC view: remove sensitive Stripe/identity/internal columns
-- (public pages should only query safe fields)
-- ---------------------------------------------------------------------------
-- Defensive: these columns are introduced in migration 046_teacher_trust_foundation.sql.
-- If 050 runs on a DB that has not applied 046 yet, the view SELECT must not fail.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS location_verification_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_verification_method text,
  ADD COLUMN IF NOT EXISTS cv_summary text,
  ADD COLUMN IF NOT EXISTS cv_verification_status text NOT NULL DEFAULT 'missing';

-- REPLACE cannot drop columns; remote DB may still have a wider legacy teachers_public.
DROP VIEW IF EXISTS public.teachers_public;

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.name,
  t.discipline,
  t.category,
  t.rating,
  t.reviews,
  t.price_per_lesson,
  t.monthly_subscription,
  t.bio,
  t.image_url,
  t.availability,
  t.location - 'private' AS location,
  t.is_verified,
  t.teaching_mode,
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
  t.verification_level,
  t.identity_verified,
  t.diploma_verified,
  t.phone_verified,
  t.video_url,
  t.identity_status,
  t.diploma_url,
  t.country_code,
  t.timezone,
  t.currency,
  t.city,
  t.region,
  t.location_verification_status,
  t.location_verified_at,
  t.location_verification_method,
  t.cv_summary,
  t.cv_verification_status,
  t.intro_session_enabled,
  t.intro_session_duration_minutes,
  t.intro_session_price_cents,
  t.intro_session_discount_percent
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL;

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS: prevent forging notifications for other users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- COURSES (demo): block public writes (keep reads)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_insert_demo" ON public.courses;
CREATE POLICY "courses_insert_demo"
  ON public.courses FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "courses_update_demo" ON public.courses;
CREATE POLICY "courses_update_demo"
  ON public.courses FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "courses_delete_demo" ON public.courses;
CREATE POLICY "courses_delete_demo"
  ON public.courses FOR DELETE TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- MESSAGES/PROFILES: prevent profile/email harvesting via spam messages.
-- Require a booking relationship to message a peer, and limit peer profile reads
-- to booking relationships (not just "any message exists").
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE (b.student_id = sender_id AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = receiver_id AND t.id = b.teacher_id))
           OR (b.student_id = receiver_id AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = sender_id AND t.id = b.teacher_id))
      )
      OR EXISTS (
        SELECT 1
        FROM public.chats c
        WHERE auth.uid()::text = ANY (c.participant_ids)
          AND receiver_id::text = ANY (c.participant_ids)
      )
    )
  );

DROP POLICY IF EXISTS "profiles_select_messaging_peers" ON public.profiles;
CREATE POLICY "profiles_select_messaging_peers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE (b.student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = profiles.id AND t.id = b.teacher_id))
         OR (b.student_id = profiles.id AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid() AND t.id = b.teacher_id))
    )
    OR EXISTS (
      SELECT 1
      FROM public.chats c
      WHERE auth.uid()::text = ANY (c.participant_ids)
        AND profiles.id::text = ANY (c.participant_ids)
    )
  );

