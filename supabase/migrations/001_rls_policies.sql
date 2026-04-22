-- =============================================================================
-- Pratiqo — Row Level Security (aligned with 000_pratiqo_schema.sql)
-- =============================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- TEACHERS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "teachers_select_public" ON public.teachers;
CREATE POLICY "teachers_select_public" ON public.teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS "teachers_insert_own" ON public.teachers;
CREATE POLICY "teachers_insert_own"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teachers_update_own" ON public.teachers;
CREATE POLICY "teachers_update_own"
  ON public.teachers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- PROFILES (replaces legacy Firestore `users`)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- BOOKINGS (teacher_id = teachers.id slug; student_id = auth user)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_select_participants" ON public.bookings;
CREATE POLICY "bookings_select_participants"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_insert_participants" ON public.bookings;
CREATE POLICY "bookings_insert_participants"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_update_participants" ON public.bookings;
CREATE POLICY "bookings_update_participants"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_delete_participants" ON public.bookings;
CREATE POLICY "bookings_delete_participants"
  ON public.bookings FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = bookings.teacher_id AND t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- STUDENT_PROGRESS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "student_progress_select_own" ON public.student_progress;
CREATE POLICY "student_progress_select_own"
  ON public.student_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student_progress_insert_own" ON public.student_progress;
CREATE POLICY "student_progress_insert_own"
  ON public.student_progress FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ASSIGNMENTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_select_participants" ON public.assignments;
CREATE POLICY "assignments_select_participants"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = assignments.teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_insert_teacher" ON public.assignments;
CREATE POLICY "assignments_insert_teacher"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_update_participants" ON public.assignments;
CREATE POLICY "assignments_update_participants"
  ON public.assignments FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = assignments.teacher_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = assignments.teacher_id AND t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- CHATS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;
CREATE POLICY "chats_select_participant"
  ON public.chats FOR SELECT TO authenticated
  USING (auth.uid()::text = ANY (participant_ids));

DROP POLICY IF EXISTS "chats_insert_participant" ON public.chats;
CREATE POLICY "chats_insert_participant"
  ON public.chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = ANY (participant_ids));

DROP POLICY IF EXISTS "chats_update_participant" ON public.chats;
CREATE POLICY "chats_update_participant"
  ON public.chats FOR UPDATE TO authenticated
  USING (auth.uid()::text = ANY (participant_ids))
  WITH CHECK (auth.uid()::text = ANY (participant_ids));

-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert_by_student" ON public.reviews;
CREATE POLICY "reviews_insert_by_student"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );

-- ---------------------------------------------------------------------------
-- COURSES (demo table for /supabase page)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "courses_select_demo" ON public.courses;
CREATE POLICY "courses_select_demo" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "courses_insert_demo" ON public.courses;
CREATE POLICY "courses_insert_demo" ON public.courses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "courses_update_demo" ON public.courses;
CREATE POLICY "courses_update_demo" ON public.courses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "courses_delete_demo" ON public.courses;
CREATE POLICY "courses_delete_demo" ON public.courses FOR DELETE TO anon, authenticated USING (true);
