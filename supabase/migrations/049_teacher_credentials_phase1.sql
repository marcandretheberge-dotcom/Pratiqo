-- Phase 1: Pratiqo Credentials (separate from Stripe Identity).
-- Core rule: credentials must never appear publicly unless identity is verified.

CREATE TABLE IF NOT EXISTS public.teacher_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  institution_name text,
  country text,
  issued_year integer,
  verification_status text NOT NULL DEFAULT 'pending',
  verification_method text,
  confidence_level text,
  public_label text,
  verified_at timestamptz,
  expires_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id),
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.teacher_credentials
    ADD CONSTRAINT teacher_credentials_type_check
    CHECK (type IN ('degree', 'certificate', 'license', 'experience', 'portfolio'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teacher_credentials
    ADD CONSTRAINT teacher_credentials_status_check
    CHECK (verification_status IN ('not_started', 'pending', 'verified', 'rejected', 'needs_review', 'expired'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teacher_credentials
    ADD CONSTRAINT teacher_credentials_method_check
    CHECK (
      verification_method IS NULL OR verification_method IN (
        'mycreds',
        'institution_direct',
        'official_registry',
        'document_review',
        'reference_check',
        'platform_history',
        'manual'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teacher_credentials
    ADD CONSTRAINT teacher_credentials_confidence_check
    CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high', 'official'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teacher_credentials
    ADD CONSTRAINT teacher_credentials_issued_year_reasonable
    CHECK (issued_year IS NULL OR (issued_year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::int));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_credentials_teacher_created
  ON public.teacher_credentials (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_credentials_status
  ON public.teacher_credentials (verification_status);

ALTER TABLE public.teacher_credentials ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own credentials.
DROP POLICY IF EXISTS "teacher_credentials_owner_select" ON public.teacher_credentials;
CREATE POLICY "teacher_credentials_owner_select"
  ON public.teacher_credentials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_credentials.teacher_id
        AND t.user_id = auth.uid()
    )
  );

-- Teachers can submit (insert) their own credentials.
DROP POLICY IF EXISTS "teacher_credentials_owner_insert" ON public.teacher_credentials;
CREATE POLICY "teacher_credentials_owner_insert"
  ON public.teacher_credentials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_id
        AND t.user_id = auth.uid()
    )
  );

-- Teachers can update limited fields while the credential is awaiting review.
-- Column-level permissions are enforced in the application; RLS only gates rows.
DROP POLICY IF EXISTS "teacher_credentials_owner_update_pending" ON public.teacher_credentials;
CREATE POLICY "teacher_credentials_owner_update_pending"
  ON public.teacher_credentials FOR UPDATE TO authenticated
  USING (
    verification_status IN ('pending', 'needs_review')
    AND EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_credentials.teacher_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    verification_status IN ('pending', 'needs_review')
    AND EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = teacher_id
        AND t.user_id = auth.uid()
    )
  );

-- Public, display-safe view:
-- Only verified credentials AND only when teacher identity is verified.
CREATE OR REPLACE VIEW public.teacher_credentials_public
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.teacher_id,
  c.type,
  c.public_label,
  c.institution_name,
  c.country,
  c.issued_year,
  c.verification_method,
  c.confidence_level,
  c.verified_at,
  c.expires_at
FROM public.teacher_credentials c
JOIN public.teachers t ON t.id = c.teacher_id
WHERE c.verification_status = 'verified'
  AND (c.expires_at IS NULL OR c.expires_at > now())
  AND (t.identity_verified = true OR t.stripe_identity_status = 'verified');

GRANT SELECT ON public.teacher_credentials_public TO anon, authenticated, service_role;

COMMENT ON TABLE public.teacher_credentials IS
  'Teacher-submitted credentials reviewed by Pratiqo (separate from Stripe Identity). Private documents must not be exposed publicly.';
COMMENT ON VIEW public.teacher_credentials_public IS
  'Public-safe verified credential summaries. Only visible when teacher identity is verified.';

