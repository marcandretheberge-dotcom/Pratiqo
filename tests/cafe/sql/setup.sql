\set ON_ERROR_STOP on
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  is_anonymous boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  banned_until timestamptz
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  display_name text,
  email text,
  role text NOT NULL DEFAULT 'student',
  is_active boolean NOT NULL DEFAULT true,
  deletion_requested_at timestamptz,
  deleted_at timestamptz
);
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-4000-8000-000000000001','admin@example.test'),
 ('00000000-0000-4000-8000-000000000002','host@example.test'),
 ('00000000-0000-4000-8000-000000000003','u1@example.test'),
 ('00000000-0000-4000-8000-000000000004','u2@example.test'),
 ('00000000-0000-4000-8000-000000000005','u3@example.test'),
 ('00000000-0000-4000-8000-000000000006','u4@example.test'),
 ('00000000-0000-4000-8000-000000000007','quota@example.test')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles(id,name,display_name,email,role) VALUES
 ('00000000-0000-4000-8000-000000000001','Admin User','Admin','admin@example.test','admin'),
 ('00000000-0000-4000-8000-000000000002','Host Person','Camille','host@example.test','student'),
 ('00000000-0000-4000-8000-000000000003','Alice Learner','Alice','u1@example.test','student'),
 ('00000000-0000-4000-8000-000000000004','Teacher User','Thomas','u2@example.test','teacher'),
 ('00000000-0000-4000-8000-000000000005','No Agreement','Morgan','u3@example.test','student'),
 ('00000000-0000-4000-8000-000000000006','Other Teacher','Jordan','u4@example.test','teacher'),
 ('00000000-0000-4000-8000-000000000007','Quota User','Quinn','quota@example.test','student')
ON CONFLICT DO NOTHING;
