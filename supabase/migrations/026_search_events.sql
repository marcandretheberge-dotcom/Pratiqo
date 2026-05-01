-- Search demand analytics (no free-text addresses; coarse geo only).
CREATE TABLE IF NOT EXISTS public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  anonymous_session_id text,
  source text NOT NULL,
  category text,
  subject text,
  format text,
  city text,
  region text,
  country_code text,
  timezone text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer,
  clicked_teacher_id text,
  booked_teacher_id text
);

CREATE INDEX IF NOT EXISTS search_events_created_at_idx ON public.search_events (created_at DESC);
CREATE INDEX IF NOT EXISTS search_events_source_idx ON public.search_events (source);
CREATE INDEX IF NOT EXISTS search_events_country_idx ON public.search_events (country_code);

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
