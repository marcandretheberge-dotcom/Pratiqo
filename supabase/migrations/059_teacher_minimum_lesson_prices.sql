-- Minimum individual lesson pricing (CAD). NOT VALID keeps legacy rows; new updates are checked.
-- Derived intro price when intro_session_price_cents IS NULL is enforced in app code.

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_price_per_lesson_minimum_chk
  CHECK (price_per_lesson IS NULL OR price_per_lesson >= 20) NOT VALID;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_home_lesson_price_minimum_chk
  CHECK (home_lesson_price IS NULL OR home_lesson_price >= 20) NOT VALID;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_intro_session_price_minimum_chk
  CHECK (intro_session_price_cents IS NULL OR intro_session_price_cents >= 2000) NOT VALID;

COMMENT ON CONSTRAINT teachers_price_per_lesson_minimum_chk ON public.teachers IS
  'Hourly studio/online rate must be at least 20 CAD when set (60 min default session).';
COMMENT ON CONSTRAINT teachers_home_lesson_price_minimum_chk ON public.teachers IS
  'Home lesson hourly rate must be at least 20 CAD when set.';
COMMENT ON CONSTRAINT teachers_intro_session_price_minimum_chk ON public.teachers IS
  'Custom intro session price must be at least 2000 cents when set; derived intro validated in app.';
