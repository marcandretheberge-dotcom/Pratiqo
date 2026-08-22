-- 124: planned package public terms consent (learner + teacher)
--
-- Stores acknowledgement of planned-package public terms version.
-- Does NOT enable public purchase, Stripe money movement, or automatic ops.

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS learner_package_terms_accepted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS learner_package_terms_policy_version text NULL;

COMMENT ON COLUMN public.planned_package_pending_orders.learner_package_terms_accepted_at IS
  'When the learner accepted planned package public terms before checkout.';
COMMENT ON COLUMN public.planned_package_pending_orders.learner_package_terms_policy_version IS
  'PLANNED_PACKAGE_PUBLIC_TERMS_VERSION accepted by the learner.';

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS teacher_package_terms_accepted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS teacher_package_terms_policy_version text NULL;

COMMENT ON COLUMN public.teachers.teacher_package_terms_accepted_at IS
  'When the independent teacher acknowledged planned package terms (required to publish package offers).';
COMMENT ON COLUMN public.teachers.teacher_package_terms_policy_version IS
  'PLANNED_PACKAGE_PUBLIC_TERMS_VERSION acknowledged by the teacher.';
