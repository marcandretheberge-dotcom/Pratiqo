-- Forward RLS hardening for program tables added after the baseline hardening
-- migrations. This migration intentionally adds no permissive client policies.

ALTER TABLE IF EXISTS public.learner_demand_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ambassador_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ambassador_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ambassador_reward_rules ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.learner_demand_leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.ambassador_links FROM anon, authenticated;
REVOKE ALL ON TABLE public.referral_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.referral_attributions FROM anon, authenticated;
REVOKE ALL ON TABLE public.referral_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.ambassador_rewards FROM anon, authenticated;
REVOKE ALL ON TABLE public.ambassador_reward_rules FROM anon, authenticated;

GRANT ALL ON TABLE public.learner_demand_leads TO service_role;
GRANT ALL ON TABLE public.ambassador_links TO service_role;
GRANT ALL ON TABLE public.referral_sessions TO service_role;
GRANT ALL ON TABLE public.referral_attributions TO service_role;
GRANT ALL ON TABLE public.referral_events TO service_role;
GRANT ALL ON TABLE public.ambassador_rewards TO service_role;
GRANT ALL ON TABLE public.ambassador_reward_rules TO service_role;
