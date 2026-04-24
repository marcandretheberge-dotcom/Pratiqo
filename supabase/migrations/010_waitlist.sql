-- Waitlist for Phase 2/3 feature launches
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_feature ON public.waitlist (feature);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);
