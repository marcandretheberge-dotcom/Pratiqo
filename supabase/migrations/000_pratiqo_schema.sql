-- Pratiqo core schema (run before RLS migration).
-- Teacher ids are stable text slugs (e.g. demo "1".."5"); optional user_id links auth.users for real teachers.

CREATE TABLE IF NOT EXISTS public.teachers (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL UNIQUE,
  name text NOT NULL,
  discipline text NOT NULL,
  category text NOT NULL,
  rating double precision NOT NULL DEFAULT 0,
  reviews integer NOT NULL DEFAULT 0,
  price_per_lesson numeric NOT NULL,
  monthly_subscription numeric,
  bio text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  availability jsonb NOT NULL DEFAULT '[]'::jsonb,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_verified boolean NOT NULL DEFAULT false,
  teaching_mode text NOT NULL,
  languages text[] NOT NULL DEFAULT ARRAY[]::text[],
  levels text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text,
  email text,
  role text NOT NULL DEFAULT 'student',
  photo_url text,
  dashboard jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date text,
  time text,
  student_level text,
  teaching_mode text,
  status text NOT NULL DEFAULT 'booked',
  price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.bookings (student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON public.bookings (teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings (created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  teacher_id text NOT NULL,
  subject text NOT NULL,
  score integer NOT NULL,
  notes text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON public.student_progress (student_id);

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date text,
  status text NOT NULL DEFAULT 'pending',
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_student ON public.assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments (teacher_id);

CREATE TABLE IF NOT EXISTS public.chats (
  id text PRIMARY KEY,
  participant_ids text[] NOT NULL,
  last_message text NOT NULL DEFAULT '',
  last_timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating numeric NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON public.reviews (teacher_id);

-- Demo CRUD page (`/supabase`)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed demo teachers (idempotent)
INSERT INTO public.teachers (id, user_id, name, discipline, category, rating, reviews, price_per_lesson, monthly_subscription, bio, image_url, availability, location, is_verified, teaching_mode, languages, levels)
VALUES
  ('1', NULL, 'Sophie Martin', 'Piano Classique', 'Musique', 4.9, 124, 45, 160, 'Pianiste concertiste diplômée du Conservatoire, j''enseigne avec passion aux débutants comme aux confirmés.', 'https://picsum.photos/seed/piano1/400/400', '["Lundi 14:00","Mercredi 10:00","Vendredi 16:00"]'::jsonb, '{"lat":45.5017,"lng":-73.5673}'::jsonb, true, 'both', ARRAY['Français','Anglais'], ARRAY['Débutant','Intermédiaire','Avancé']),
  ('2', NULL, 'Master Hiroshi', 'Karaté Shotokan', 'Arts Martiaux', 5, 89, 30, 95, '30 ans d''expérience dans les arts martiaux. Discipline, respect et maîtrise de soi.', 'https://picsum.photos/seed/karate1/400/400', '["Mardi 18:00","Jeudi 18:00","Samedi 10:00"]'::jsonb, '{"lat":45.523,"lng":-73.582}'::jsonb, true, 'person', ARRAY['Français','Japonais'], ARRAY['Tous niveaux']),
  ('3', NULL, 'Elena Rodriguez', 'Salsa & Bachata', 'Danse', 4.8, 210, 25, 80, 'Venez apprendre à danser dans une ambiance festive et décontractée !', 'https://picsum.photos/seed/dance1/400/400', '["Lundi 19:00","Mercredi 19:00","Vendredi 20:00"]'::jsonb, '{"lat":45.51,"lng":-73.555}'::jsonb, false, 'both', ARRAY['Espagnol','Français','Anglais'], ARRAY['Intermédiaire']),
  ('4', NULL, 'Jean Dupont', 'Anglais & Espagnol', 'Langues', 4.7, 56, 35, 120, 'Professeur bilingue avec 10 ans d''expérience en immersion totale.', 'https://picsum.photos/seed/lang1/400/400', '["Mardi 14:00","Jeudi 10:00","Samedi 11:00"]'::jsonb, '{"lat":45.49,"lng":-73.6}'::jsonb, true, 'online', ARRAY['Français','Anglais','Espagnol'], ARRAY['Scolaire','Business']),
  ('5', NULL, 'Dr. Clara Vallet', 'Violon', 'Musique', 4.9, 42, 50, 180, 'Spécialiste de la méthode Suzuki pour les enfants et d''une approche personnalisée pour les adultes.', 'https://picsum.photos/seed/violin1/400/400', '["Lundi 16:00","Jeudi 15:00","Vendredi 11:00"]'::jsonb, '{"lat":45.535,"lng":-73.62}'::jsonb, true, 'both', ARRAY['Français','Allemand'], ARRAY['Enfants','Préparation Concours'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  discipline = EXCLUDED.discipline,
  category = EXCLUDED.category,
  rating = EXCLUDED.rating,
  reviews = EXCLUDED.reviews,
  price_per_lesson = EXCLUDED.price_per_lesson,
  monthly_subscription = EXCLUDED.monthly_subscription,
  bio = EXCLUDED.bio,
  image_url = EXCLUDED.image_url,
  availability = EXCLUDED.availability,
  location = EXCLUDED.location,
  is_verified = EXCLUDED.is_verified,
  teaching_mode = EXCLUDED.teaching_mode,
  languages = EXCLUDED.languages,
  levels = EXCLUDED.levels,
  updated_at = now();
