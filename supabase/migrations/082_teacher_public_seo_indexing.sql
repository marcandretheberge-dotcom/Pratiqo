-- Safe public SEO indexing for teacher profiles.
-- Consent + slug fields live on public.teachers; they are NOT projected into
-- teachers_public / list_public_teachers() (server-side eligibility only).

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_indexing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_indexing_consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS search_indexing_consent_version text,
  ADD COLUMN IF NOT EXISTS public_profile_slug text,
  ADD COLUMN IF NOT EXISTS public_profile_last_indexable_at timestamptz;

COMMENT ON COLUMN public.teachers.public_profile_enabled IS
  'Teacher opted in to a public profile page (/professeurs/[slug]). Distinct from marketplace is_public.';

COMMENT ON COLUMN public.teachers.search_indexing_consent IS
  'Teacher consented to search-engine indexing of their public profile page.';

COMMENT ON COLUMN public.teachers.search_indexing_consented_at IS
  'Timestamp when search_indexing_consent was last granted.';

COMMENT ON COLUMN public.teachers.search_indexing_consent_version IS
  'Version string of the consent copy shown when consent was granted.';

COMMENT ON COLUMN public.teachers.public_profile_slug IS
  'Canonical slug for /professeurs/[slug]. Assigned server-side when consent is granted.';

COMMENT ON COLUMN public.teachers.public_profile_last_indexable_at IS
  'Last time the profile satisfied all indexability checks (sitemap + robots).';

CREATE UNIQUE INDEX IF NOT EXISTS teachers_public_profile_slug_unique_idx
  ON public.teachers (public_profile_slug)
  WHERE public_profile_slug IS NOT NULL;

-- Pin SEO consent columns on non-service-role writes (same guard as 069/081).
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

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
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
    NEW.verified_experience_active := false;
    NEW.verified_experience_set_at := NULL;
    NEW.verified_experience_set_by := NULL;
    -- 082: SEO consent is granted only via service-role API routes.
    NEW.public_profile_enabled := false;
    NEW.search_indexing_consent := false;
    NEW.search_indexing_consented_at := NULL;
    NEW.search_indexing_consent_version := NULL;
    NEW.public_profile_slug := NULL;
    NEW.public_profile_last_indexable_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
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
    NEW.verified_experience_active := OLD.verified_experience_active;
    NEW.verified_experience_set_at := OLD.verified_experience_set_at;
    NEW.verified_experience_set_by := OLD.verified_experience_set_by;
    -- 082: consent + slug are server-controlled.
    NEW.public_profile_enabled := OLD.public_profile_enabled;
    NEW.search_indexing_consent := OLD.search_indexing_consent;
    NEW.search_indexing_consented_at := OLD.search_indexing_consented_at;
    NEW.search_indexing_consent_version := OLD.search_indexing_consent_version;
    NEW.public_profile_slug := OLD.public_profile_slug;
    NEW.public_profile_last_indexable_at := OLD.public_profile_last_indexable_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.teachers_preserve_sensitive_client_fields() IS
  '082: extends 081 to pin public SEO consent + slug columns on non-service-role writes. Consent is mutable only via service-role API routes.';
