-- Apply before deploying the learner demand API. Existing rows remain unconsented;
-- never infer permission to send an alert from a historical email address.
ALTER TABLE public.learner_demand_leads
  ADD COLUMN IF NOT EXISTS alert_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS adult_contact_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discipline_id text,
  ADD COLUMN IF NOT EXISTS municipality_key text,
  ADD COLUMN IF NOT EXISTS requested_format text NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS availability_preference text NOT NULL DEFAULT 'any';

ALTER TABLE public.learner_demand_leads
  ADD CONSTRAINT learner_demand_requested_format_check CHECK (requested_format IN ('in_person', 'online')),
  ADD CONSTRAINT learner_demand_availability_preference_check
  CHECK (availability_preference IN ('any', 'weekday_day', 'weekday_evening', 'weekend'));

-- A local need and an explicitly online need must never overwrite one another.
DROP INDEX public.idx_learner_demand_open_dedupe;
CREATE UNIQUE INDEX idx_learner_demand_open_dedupe
  ON public.learner_demand_leads
  (email_normalized, subject_normalized, city_normalized, accepts_online, requested_format);

CREATE INDEX IF NOT EXISTS idx_learner_demand_consented_open
  ON public.learner_demand_leads (city_normalized, discipline_id, requested_format, updated_at DESC)
  WHERE status = 'open' AND alert_consent_at IS NOT NULL;

-- Repeated browser submissions update the need, not the already-delivered alert.
CREATE OR REPLACE FUNCTION public.preserve_learner_demand_delivery_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  -- A withdrawn request is immutable to public resubmissions, not re-consented.
  IF OLD.status = 'closed' AND NEW.status IN ('open', 'matched') THEN
    RETURN OLD;
  END IF;
  IF OLD.status IN ('notified', 'converted', 'closed') AND NEW.status IN ('open', 'matched') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_learner_demand_delivery_state() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER preserve_learner_demand_delivery_state
  BEFORE UPDATE ON public.learner_demand_leads
  FOR EACH ROW EXECUTE FUNCTION public.preserve_learner_demand_delivery_state();

CREATE VIEW public.learner_unmet_demand_summary WITH (security_invoker = true) AS
SELECT coalesce(municipality_key, 'unclassified') AS city_normalized, coalesce(discipline_id, 'unclassified') AS discipline_id,
  requested_format, count(*) AS request_count, max(updated_at) AS latest_request_at
FROM public.learner_demand_leads
WHERE status = 'open' AND alert_consent_at IS NOT NULL AND adult_contact_confirmed
GROUP BY coalesce(municipality_key, 'unclassified'), coalesce(discipline_id, 'unclassified'), requested_format;
REVOKE ALL ON public.learner_unmet_demand_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.learner_unmet_demand_summary TO service_role;
