-- Learner demand funnel: captures anonymous pre-account demand from the
-- public "Trouve ton prof" flow. PII stays server-only; clients write through
-- /api/learner-demand using the service-role client.

CREATE TABLE IF NOT EXISTS public.learner_demand_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL,
  subject text NOT NULL,
  subject_normalized text NOT NULL,
  city text NOT NULL,
  city_normalized text NOT NULL,
  region text,
  country_code text NOT NULL DEFAULT 'CA',
  accepts_online boolean NOT NULL DEFAULT true,
  locale text NOT NULL DEFAULT 'fr',
  source text NOT NULL DEFAULT 'teacher_finder',
  status text NOT NULL DEFAULT 'open',
  match_type text NOT NULL DEFAULT 'none',
  matched_teacher_count integer NOT NULL DEFAULT 0,
  last_match_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT learner_demand_email_length CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT learner_demand_subject_length CHECK (char_length(subject) BETWEEN 1 AND 120),
  CONSTRAINT learner_demand_city_length CHECK (char_length(city) BETWEEN 1 AND 120),
  CONSTRAINT learner_demand_country_code_length CHECK (char_length(country_code) BETWEEN 2 AND 10),
  CONSTRAINT learner_demand_status_check CHECK (status IN ('open', 'matched', 'notified', 'converted', 'closed')),
  CONSTRAINT learner_demand_match_type_check CHECK (match_type IN ('none', 'local', 'online')),
  CONSTRAINT learner_demand_match_count_check CHECK (matched_teacher_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_demand_open_dedupe
  ON public.learner_demand_leads (
    email_normalized,
    subject_normalized,
    city_normalized,
    accepts_online
  );

CREATE INDEX IF NOT EXISTS idx_learner_demand_subject_city
  ON public.learner_demand_leads (subject_normalized, city_normalized, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_demand_created_at
  ON public.learner_demand_leads (created_at DESC);

ALTER TABLE public.learner_demand_leads ENABLE ROW LEVEL SECURITY;

-- Deliberately no anon/authenticated SELECT/INSERT/UPDATE/DELETE policies.
-- The public form posts to a server route; the service role bypasses RLS.
REVOKE ALL ON TABLE public.learner_demand_leads FROM anon, authenticated;

COMMENT ON TABLE public.learner_demand_leads IS
  'Private anonymous learner demand captured before account creation. Server-only access; used to match supply and notify learners when a relevant teacher becomes available.';
COMMENT ON COLUMN public.learner_demand_leads.email IS
  'Email used only for the requested teacher-match result / availability notification unless separate marketing consent is collected elsewhere.';
COMMENT ON COLUMN public.learner_demand_leads.source IS
  'Acquisition source or campaign slug, e.g. teacher_finder, meta_spanish, meta_piano.';
