-- Learning disciplines phase 1 foundation.
-- This migration is already applied on the remote DB; keep it locally so migration history matches.
-- Idempotent on purpose.

create table if not exists public.learning_disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  category text,
  created_at timestamptz not null default now()
);

alter table public.teacher_disciplines
  add column if not exists discipline_id uuid,
  add column if not exists specialty text,
  add column if not exists specialties text[] default '{}'::text[],
  add column if not exists category text,
  add column if not exists created_at timestamptz not null default now();

alter table public.group_sessions
  add column if not exists discipline_id uuid,
  add column if not exists teacher_discipline_id uuid,
  add column if not exists classification_snapshot jsonb default '{}'::jsonb;
