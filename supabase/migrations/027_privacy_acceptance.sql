-- Migration 027: Privacy acceptance audit trail
--
-- Stores legal proof that a user explicitly accepted the privacy policy
-- at signup. Required for LPRPDE / Loi 25 compliance.
--
-- privacy_accepted_at : timestamp of acceptance (NULL = not yet accepted)
-- privacy_version     : version string of the policy accepted (e.g. "1.0")

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version     TEXT;
