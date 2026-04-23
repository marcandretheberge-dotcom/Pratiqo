-- Home lesson (cours à domicile) — teacher settings + booking address
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_enabled boolean DEFAULT false;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_price numeric;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_radius_km integer DEFAULT 25;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_min_duration integer DEFAULT 60;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_requires_confirmation boolean DEFAULT true;

-- Minimum 2h when distance student → teacher base exceeds 20 km (toggle in teacher settings)
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS home_lesson_force_2h_over_20km boolean DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS student_address text;
