-- P0 RLS policy hardening.
-- Keep read paths needed by the app, but remove browser-side writes for
-- payment-sensitive bookings, arbitrary chats, credits, and sensitive profile fields.

-- ---------------------------------------------------------------------------
-- credit_transactions: users may read their own ledger only.
-- Server/service-role code writes transactions and bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role writes credit transactions" ON public.credit_transactions;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_transactions'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.credit_transactions', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users read own credit transactions" ON public.credit_transactions;
CREATE POLICY "Users read own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chats: old rows remain readable by participants, but clients cannot create
-- or mutate chat rows. Messaging is mediated through api/messages/send.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats_insert_participant" ON public.chats;
DROP POLICY IF EXISTS "chats_update_participant" ON public.chats;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chats'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;
CREATE POLICY "chats_select_participant"
  ON public.chats
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = ANY (participant_ids));

-- ---------------------------------------------------------------------------
-- bookings: participants can read their bookings. Student-side booking creation
-- remains client-side for now, but only for pending_payment rows owned by the
-- current student. Lifecycle transitions are server/API controlled.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_update_participants" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_participants" ON public.bookings;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND cmd IN ('UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "bookings_select_participants" ON public.bookings;
CREATE POLICY "bookings_select_participants"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = bookings.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_insert_participants" ON public.bookings;
CREATE POLICY "bookings_insert_participants"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending_payment'
    AND (
      learner_profile_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.learner_profiles lp
        WHERE lp.id = learner_profile_id
          AND lp.owner_user_id = auth.uid()
          AND lp.archived_at IS NULL
      )
    )
  );

-- ---------------------------------------------------------------------------
-- profiles: keep broad owner update policy for harmless user-owned fields, but
-- preserve sensitive system fields before non-service updates are written.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_preserve_sensitive_client_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.credit_balance := OLD.credit_balance;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.plan := OLD.plan;
  NEW.plan_expires_at := OLD.plan_expires_at;
  NEW.active_student_count := OLD.active_student_count;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.subscription_status := OLD.subscription_status;
  NEW.pro_started_at := OLD.pro_started_at;
  NEW.pro_current_period_end := OLD.pro_current_period_end;
  NEW.pro_cancel_at_period_end := OLD.pro_cancel_at_period_end;
  NEW.loyalty_tier := OLD.loyalty_tier;
  NEW.loyalty_annual_volume := OLD.loyalty_annual_volume;
  NEW.loyalty_cashback_earned := OLD.loyalty_cashback_earned;
  NEW.ristourne_months_active := OLD.ristourne_months_active;
  NEW.teacher_onboarding_complete := OLD.teacher_onboarding_complete;
  NEW.welcome_student_email_sent_at := OLD.welcome_student_email_sent_at;
  NEW.tax_status_acknowledged := OLD.tax_status_acknowledged;
  NEW.tax_status_acknowledged_at := OLD.tax_status_acknowledged_at;
  NEW.no_exclusivity_acknowledged := OLD.no_exclusivity_acknowledged;
  NEW.no_income_guarantee_acknowledged := OLD.no_income_guarantee_acknowledged;
  NEW.deleted_at := OLD.deleted_at;
  NEW.deletion_requested_at := OLD.deletion_requested_at;
  NEW.deactivated_at := OLD.deactivated_at;
  NEW.is_active := OLD.is_active;
  NEW.anonymized_at := OLD.anonymized_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_preserve_sensitive_client_fields_trigger ON public.profiles;
CREATE TRIGGER profiles_preserve_sensitive_client_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_preserve_sensitive_client_fields();

COMMENT ON FUNCTION public.profiles_preserve_sensitive_client_fields() IS
  'Preserves sensitive profile fields for non-service JWT clients while allowing harmless owner profile fields to be updated.';
