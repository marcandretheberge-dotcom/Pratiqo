-- Private operational lifecycle facts, not advertising events. Nothing is sent
-- to PostHog without browser analytics consent; no contact/free text is stored.
BEGIN;
CREATE TABLE public.learner_funnel_facts (
  event_name text NOT NULL CHECK (event_name IN ('booking_confirmed','lesson_completed_paid','waitlist_submitted','booking_cancelled','booking_refunded','booking_disputed')),
  entity_id uuid NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_name, entity_id)
);
CREATE INDEX learner_funnel_student_completed ON public.learner_funnel_facts(student_id, occurred_at)
  WHERE event_name = 'lesson_completed_paid';
ALTER TABLE public.learner_funnel_facts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learner_funnel_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.learner_funnel_facts TO service_role;

CREATE FUNCTION public.record_learner_booking_facts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE b public.bookings%ROWTYPE; p public.booking_payments%ROWTYPE; target uuid;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN target := NEW.id; ELSE target := NEW.booking_id; END IF;
  -- Serialize payment/completion transitions so concurrent commits cannot both
  -- observe the other half of completed-and-paid as missing.
  SELECT * INTO b FROM public.bookings WHERE id = target FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO p FROM public.booking_payments WHERE booking_id = target;
  IF b.status = 'confirmed' THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id,student_id)
      VALUES ('booking_confirmed',b.id,b.student_id) ON CONFLICT DO NOTHING;
  END IF;
  IF b.status = 'completed' AND b.completion_outcome = 'held' AND p.payment_status = 'paid'
    AND coalesce(p.refunded_cents,0) = 0 THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id,student_id)
      VALUES ('lesson_completed_paid',b.id,b.student_id) ON CONFLICT DO NOTHING;
  END IF;
  IF b.status = 'cancelled' THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id,student_id)
      VALUES ('booking_cancelled',b.id,b.student_id) ON CONFLICT DO NOTHING;
  END IF;
  IF p.payment_status = 'disputed' THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id,student_id)
      VALUES ('booking_disputed',b.id,b.student_id) ON CONFLICT DO NOTHING;
  END IF;
  IF p.payment_status IN ('refunded','partially_refunded') OR coalesce(p.refunded_cents,0) > 0 THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id,student_id)
      VALUES ('booking_refunded',b.id,b.student_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_learner_booking_facts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER learner_booking_facts AFTER INSERT OR UPDATE OF status, completion_outcome ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.record_learner_booking_facts();
CREATE TRIGGER learner_payment_facts AFTER INSERT OR UPDATE OF payment_status, refunded_cents ON public.booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.record_learner_booking_facts();

CREATE FUNCTION public.record_learner_waitlist_fact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.alert_consent_at IS NOT NULL AND NEW.adult_contact_confirmed AND NEW.status <> 'closed' THEN
    INSERT INTO public.learner_funnel_facts(event_name,entity_id)
      VALUES ('waitlist_submitted',NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_learner_waitlist_fact() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER learner_waitlist_fact AFTER INSERT OR UPDATE ON public.learner_demand_leads
  FOR EACH ROW EXECUTE FUNCTION public.record_learner_waitlist_fact();

CREATE VIEW public.learner_funnel_totals WITH (security_invoker = true) AS
SELECT event_name, count(*) AS event_count, count(DISTINCT student_id) AS learner_count
FROM public.learner_funnel_facts GROUP BY event_name;
REVOKE ALL ON public.learner_funnel_totals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.learner_funnel_totals TO service_role;
CREATE TABLE public.learner_waitlist_booking_links (
  lead_id uuid NOT NULL REFERENCES public.learner_demand_leads(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id,booking_id)
);
ALTER TABLE public.learner_waitlist_booking_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learner_waitlist_booking_links FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.learner_waitlist_booking_links TO service_role;

-- First-ever eligible paid lesson uses the complete ledger, not instrumentation
-- start time. Missing historical timestamps are not invented.
CREATE VIEW public.learner_first_paid_lessons WITH (security_invoker=true) AS
SELECT b.student_id,min(greatest(b.completed_at,p.paid_at)) AS first_paid_lesson_at
FROM public.bookings b JOIN public.booking_payments p ON p.booking_id=b.id
WHERE b.status='completed' AND b.completion_outcome='held' AND p.payment_status='paid'
  AND coalesce(p.refunded_cents,0)=0 AND b.completed_at IS NOT NULL AND p.paid_at IS NOT NULL
GROUP BY b.student_id;
REVOKE ALL ON public.learner_first_paid_lessons FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.learner_first_paid_lessons TO service_role;

CREATE VIEW public.learner_waitlist_conversion_totals WITH (security_invoker=true) AS
SELECT count(*) AS qualified_requests,
 count(*) FILTER (WHERE EXISTS (
  SELECT 1 FROM public.learner_waitlist_booking_links l
  JOIN public.bookings b ON b.id=l.booking_id JOIN public.booking_payments p ON p.booking_id=b.id
  WHERE l.lead_id=d.id AND b.status='completed' AND b.completion_outcome='held'
    AND p.payment_status='paid' AND coalesce(p.refunded_cents,0)=0
 )) AS requests_with_completed_paid_lesson
FROM public.learner_demand_leads d
WHERE d.alert_consent_at IS NOT NULL AND d.adult_contact_confirmed AND d.status<>'closed';
REVOKE ALL ON public.learner_waitlist_conversion_totals FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.learner_waitlist_conversion_totals TO service_role;
COMMIT;
