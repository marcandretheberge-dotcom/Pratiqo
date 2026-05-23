-- Production access hardening: prevent a non-service-role caller (browser
-- supabase-js client running as `anon` or `authenticated`) from upgrading
-- their own trust signals or Stripe-linked fields on `public.teachers`.
--
-- RLS already restricts INSERT/UPDATE on `teachers` to the row's owner
-- (`auth.uid() = user_id`), but neither RLS nor a WITH CHECK clause can
-- police individual column values. Without this trigger a malicious teacher
-- can ship the values below directly from the browser and instantly fake:
--
--   identity_verified, diploma_verified, phone_verified, is_verified,
--   verification_level, stripe_account_id, stripe_connect_* (charges /
--   payouts / requirements), stripe_identity_*, location_verification_*,
--   cv_verification_status, deactivated_at, deleted_at, is_public.
--
-- The trigger fires only for non-service-role JWTs, so all server code
-- (webhooks, admin review, onboarding completion API, Stripe Connect sync,
-- cron jobs) continues to write these columns normally through the
-- service-role Supabase client.

CREATE OR REPLACE FUNCTION public.teachers_preserve_sensitive_client_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );

  -- Service-role writes (webhooks, admin API, cron jobs) bypass this guard.
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force trust / payment / verification fields to safe defaults on
    -- self-inserts (initial onboarding row). Server flows that legitimately
    -- need to bootstrap these fields run with the service-role JWT.
    NEW.identity_verified := false;
    NEW.diploma_verified := false;
    NEW.phone_verified := false;
    NEW.is_verified := false;
    NEW.verification_level := 0;
    NEW.stripe_account_id := NULL;
    NEW.stripe_connect_onboarding_complete := false;
    NEW.stripe_connect_charges_enabled := false;
    NEW.stripe_connect_payouts_enabled := false;
    NEW.stripe_connect_requirements_due := '[]'::jsonb;
    NEW.stripe_connect_disabled_reason := NULL;
    NEW.stripe_connect_last_synced_at := NULL;
    NEW.stripe_identity_status := NULL;
    NEW.stripe_identity_failed_reason := NULL;
    NEW.stripe_identity_session_id := NULL;
    NEW.stripe_identity_verified_at := NULL;
    NEW.location_verification_status := 'missing';
    NEW.location_verified_at := NULL;
    NEW.location_verification_method := NULL;
    NEW.cv_verification_status := 'missing';
    NEW.identity_status := 'none';
    NEW.deactivated_at := NULL;
    NEW.deleted_at := NULL;
    -- is_public defaults to NULL/true in policy; allow the user to start
    -- public by default. is_public toggles are still client-writable.
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Preserve sensitive OLD values on self-update. The teacher can change
    -- their bio, prices, availability, languages, location, etc., but the
    -- columns below are only mutated by service-role code paths.
    NEW.identity_verified := OLD.identity_verified;
    NEW.diploma_verified := OLD.diploma_verified;
    NEW.phone_verified := OLD.phone_verified;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_level := OLD.verification_level;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_connect_onboarding_complete := OLD.stripe_connect_onboarding_complete;
    NEW.stripe_connect_charges_enabled := OLD.stripe_connect_charges_enabled;
    NEW.stripe_connect_payouts_enabled := OLD.stripe_connect_payouts_enabled;
    NEW.stripe_connect_requirements_due := OLD.stripe_connect_requirements_due;
    NEW.stripe_connect_disabled_reason := OLD.stripe_connect_disabled_reason;
    NEW.stripe_connect_last_synced_at := OLD.stripe_connect_last_synced_at;
    NEW.stripe_identity_status := OLD.stripe_identity_status;
    NEW.stripe_identity_failed_reason := OLD.stripe_identity_failed_reason;
    NEW.stripe_identity_session_id := OLD.stripe_identity_session_id;
    NEW.stripe_identity_verified_at := OLD.stripe_identity_verified_at;
    NEW.location_verification_status := OLD.location_verification_status;
    NEW.location_verified_at := OLD.location_verified_at;
    NEW.location_verification_method := OLD.location_verification_method;
    NEW.cv_verification_status := OLD.cv_verification_status;
    NEW.identity_status := OLD.identity_status;
    NEW.deactivated_at := OLD.deactivated_at;
    NEW.deleted_at := OLD.deleted_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teachers_preserve_sensitive_client_fields_trigger ON public.teachers;
CREATE TRIGGER teachers_preserve_sensitive_client_fields_trigger
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.teachers_preserve_sensitive_client_fields();

COMMENT ON FUNCTION public.teachers_preserve_sensitive_client_fields() IS
  'Forces trust/Stripe/verification columns on public.teachers to safe values for non-service JWT clients. Service-role writes (webhooks, admin, cron) bypass this guard.';
