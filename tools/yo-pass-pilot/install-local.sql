-- Explicit opt-in fixture. Never part of db push; no production migration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.yo_pass_pilot_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  wallet jsonb NOT NULL CHECK (jsonb_typeof(wallet) = 'object')
);
ALTER TABLE public.yo_pass_pilot_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.yo_pass_pilot_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.yo_pass_pilot_accounts TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
