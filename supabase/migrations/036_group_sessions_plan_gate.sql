-- Group sessions plan gate / discipline linkage foundation.
-- This migration is already applied on the remote DB; keep it locally so migration history matches.
-- Idempotent on purpose.

alter table public.group_sessions
  add column if not exists discipline_id uuid,
  add column if not exists teacher_discipline_id uuid,
  add column if not exists classification_snapshot jsonb default '{}'::jsonb;
