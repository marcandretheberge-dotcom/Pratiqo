-- Founder commission promotion ledger.
--
-- This table is the single source of truth for the admin-controlled
-- "founder promotion" — a temporary commission override that grants a
-- teacher Membre-Pro-like marketplace commission conditions (default
-- 5 %, default 6 months) WITHOUT marking the teacher as a paid Stripe
-- Membre Pro subscriber. The Stripe-driven `profiles.plan = 'pro'`
-- subscription remains the only signal of paid Pro status; this table
-- never sets it.
--
-- It also serves as the append-only audit trail. Every admin grant
-- INSERTs a new row (with `created_by` + `created_at`); every admin
-- early-termination UPDATEs the same row's `ended_early_at` /
-- `ended_early_by`. Reads are denied to all JWT roles by default.
-- Service-role bypasses RLS for inserts/updates and any future
-- admin-side reads — matching the spirit of migration 079
-- (admin_role_change_audit) and migration 061 (role guard).

create table if not exists public.admin_founder_promotions (
  id                    uuid primary key default gen_random_uuid(),
  teacher_id            uuid not null,                          -- profiles.id of the teacher
  started_at            timestamptz not null default now(),
  ends_at               timestamptz not null,                   -- exact end date shown to admin
  commission_rate_bps   integer not null default 500
                          check (commission_rate_bps between 0 and 10000),
  created_at            timestamptz not null default now(),
  created_by            uuid not null,                          -- profiles.id of the admin who activated
  created_by_email      text,                                   -- snapshot at activation time
  ended_early_at        timestamptz,                            -- non-null = admin terminated early
  ended_early_by        uuid,                                   -- profiles.id of the admin who ended
  ended_early_by_email  text,                                   -- snapshot at termination time
  notes                 text,                                   -- optional free-text justification
  source                text not null default 'admin/users'     -- which surface produced the row
);

-- Active-promo lookup: latest non-terminated row per teacher_id, ordered by ends_at desc.
create index if not exists admin_founder_promotions_teacher_active_idx
  on public.admin_founder_promotions (teacher_id, ends_at desc)
  where ended_early_at is null;

-- Forensic / audit lookup by teacher (every grant + termination event in time order).
create index if not exists admin_founder_promotions_teacher_history_idx
  on public.admin_founder_promotions (teacher_id, created_at desc);

-- Optional: lookup by acting admin for forensic reviews.
create index if not exists admin_founder_promotions_actor_idx
  on public.admin_founder_promotions (created_by, created_at desc);

alter table public.admin_founder_promotions enable row level security;

-- Deny-by-default: no policies are created, so authenticated/anon JWTs
-- receive zero rows and cannot insert/update. Service-role bypasses RLS
-- for all operations. This mirrors migration 079.

comment on table public.admin_founder_promotions is
  'Source of truth + append-only audit log for admin-granted founder commission promotions. Writes are service-role only; reads are denied to all JWT roles by default. Does NOT mark the teacher as a paid Stripe Membre Pro subscriber.';

comment on column public.admin_founder_promotions.commission_rate_bps is
  'Promotional commission rate in basis points. Default 500 bps = 5 %. Bounded 0–10000.';

comment on column public.admin_founder_promotions.ends_at is
  'Exact end timestamp. After this moment, the effective-commission helper falls back to standard rules unless the teacher has paid Membre Pro.';

comment on column public.admin_founder_promotions.ended_early_at is
  'Set when an admin terminates the promotion before its natural ends_at. Non-null = terminated; the row is preserved as an audit record.';
