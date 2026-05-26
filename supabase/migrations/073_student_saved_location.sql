-- Optional private student location for search distance estimates and
-- home-lesson address prefill.
--
-- IMPORTANT: This information must remain visible only to the owning user.
-- We cannot store it on public.profiles because migration 050
-- ("profiles_select_messaging_peers") grants any teacher who shares a booking
-- with a student SELECT on that student's profile row. That policy is needed
-- for the inbox / booking surfaces, but it would also expose this private
-- address column to every teacher the student has ever booked. Even when no
-- current UI selects the column, the RLS contract would already permit it.
--
-- Instead we keep the data in a dedicated owner-only table with strict RLS so
-- the existing peer-profile policy cannot reach it. The previous (uncommitted)
-- profiles.student_location column is dropped here for safety; nothing in
-- production references it.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS student_location;

CREATE TABLE IF NOT EXISTS public.student_private_locations (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location   jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_private_locations IS
  'Optional private learner location/address used for distance estimates and home lesson prefill. Owner-only via RLS; never joined into teacher-facing reads.';

COMMENT ON COLUMN public.student_private_locations.location IS
  'Normalized address/coordinates jsonb. Only the owning auth.uid() can read or write.';

ALTER TABLE public.student_private_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_private_locations_select_own" ON public.student_private_locations;
CREATE POLICY "student_private_locations_select_own"
  ON public.student_private_locations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_private_locations_insert_own" ON public.student_private_locations;
CREATE POLICY "student_private_locations_insert_own"
  ON public.student_private_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_private_locations_update_own" ON public.student_private_locations;
CREATE POLICY "student_private_locations_update_own"
  ON public.student_private_locations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_private_locations_delete_own" ON public.student_private_locations;
CREATE POLICY "student_private_locations_delete_own"
  ON public.student_private_locations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.student_private_locations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_private_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_private_locations TO service_role;
