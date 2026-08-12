-- Admin promotions + student credits foundation.
--
-- Scope (this migration only):
-- * internal promo-code registry for admin operations;
-- * admin-granted student credit ledger with reasons;
-- * append-only student credit movement log;
-- * general admin audit log for promo/credit actions.
--
-- Explicit non-goals:
-- * does NOT wire promo codes into Stripe Checkout / PaymentIntents;
-- * does NOT mutate profiles.credit_balance (existing spendable credits
--   remain owned by lib/credits.ts + checkout until a later PR);
-- * does NOT create Stripe coupons or promotion codes;
-- * does NOT change booking or commission math.
--
-- Security contract:
-- * RLS enabled on every new table;
-- * zero JWT policies (deny-by-default for anon/authenticated);
-- * service_role bypasses RLS for admin API writes after requireAdminApi;
-- * mirrors migrations 079 / 080.

-- ── admin_promo_codes ───────────────────────────────────────────────

create table if not exists public.admin_promo_codes (
  id                         uuid primary key default gen_random_uuid(),
  code                       text not null,                              -- normalized uppercase, no spaces
  description                text,
  discount_type              text not null
                               check (discount_type in ('fixed_amount', 'percent')),
  amount_cents               integer
                               check (amount_cents is null or amount_cents > 0),
  percent_off                numeric
                               check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  currency                   text not null default 'CAD',
  status                     text not null default 'active'
                               check (status in ('active', 'paused', 'expired', 'archived')),
  starts_at                  timestamptz,
  expires_at                 timestamptz,
  max_total_redemptions      integer
                               check (max_total_redemptions is null or max_total_redemptions > 0),
  max_redemptions_per_user   integer
                               check (max_redemptions_per_user is null or max_redemptions_per_user > 0),
  new_students_only          boolean not null default false,
  market_code                text,                                       -- null = global/internal; CA, UY later
  created_by                 uuid not null,                              -- profiles.id of admin
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint admin_promo_codes_discount_shape check (
    (discount_type = 'fixed_amount' and amount_cents is not null and percent_off is null)
    or
    (discount_type = 'percent' and percent_off is not null and amount_cents is null)
  )
);

-- Unique active code names (paused/expired/archived may reuse later if needed,
-- but active duplicates are forbidden).
create unique index if not exists admin_promo_codes_active_code_uidx
  on public.admin_promo_codes (code)
  where status = 'active';

create index if not exists admin_promo_codes_status_idx
  on public.admin_promo_codes (status, created_at desc);

create index if not exists admin_promo_codes_created_by_idx
  on public.admin_promo_codes (created_by, created_at desc);

alter table if exists public.admin_promo_codes enable row level security;

-- Deny-by-default: no policies. Service-role only via admin APIs.

comment on table public.admin_promo_codes is
  '087: Internal admin promo-code registry. Not applied at checkout yet. RLS deny-by-default; service-role writes only after requireAdminApi.';

comment on column public.admin_promo_codes.code is
  'Uppercase normalized promo code with no spaces. Active codes are unique.';

comment on column public.admin_promo_codes.discount_type is
  'fixed_amount requires amount_cents; percent requires percent_off in (0, 100].';

-- ── student_credits ─────────────────────────────────────────────────

create table if not exists public.student_credits (
  id                  uuid primary key default gen_random_uuid(),
  student_profile_id  uuid not null,                                     -- profiles.id of the student
  amount_cents        integer not null check (amount_cents > 0),
  currency            text not null default 'CAD',
  remaining_cents     integer not null check (remaining_cents >= 0),
  status              text not null default 'active'
                        check (status in ('active', 'used', 'expired', 'voided')),
  reason_code         text not null,                                     -- support_compensation | contest_prize | …
  reason_note         text not null,                                     -- mandatory free-text justification
  expires_at          timestamptz,
  created_by          uuid not null,                                     -- profiles.id of admin
  created_at          timestamptz not null default now(),
  voided_by           uuid,
  voided_at           timestamptz,
  void_reason         text,
  constraint student_credits_remaining_lte_amount check (remaining_cents <= amount_cents),
  constraint student_credits_void_shape check (
    (status <> 'voided' and voided_at is null and voided_by is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

create index if not exists student_credits_student_idx
  on public.student_credits (student_profile_id, created_at desc);

create index if not exists student_credits_status_idx
  on public.student_credits (status, created_at desc);

create index if not exists student_credits_created_by_idx
  on public.student_credits (created_by, created_at desc);

alter table if exists public.student_credits enable row level security;

comment on table public.student_credits is
  '087: Admin-granted student credits with mandatory reason. Not yet applied to profiles.credit_balance. RLS deny-by-default; service-role only.';

comment on column public.student_credits.reason_note is
  'Mandatory free-text justification. Credits without a note must be rejected in the API.';

-- ── student_credit_ledger ───────────────────────────────────────────

create table if not exists public.student_credit_ledger (
  id                   uuid primary key default gen_random_uuid(),
  student_credit_id    uuid not null,                                    -- student_credits.id
  student_profile_id   uuid not null,                                    -- profiles.id
  entry_type           text not null
                         check (entry_type in ('grant', 'use', 'void', 'expire', 'adjustment')),
  amount_cents         integer not null,                                 -- signed movement
  balance_after_cents  integer not null check (balance_after_cents >= 0),
  reference_type       text,                                             -- booking | payment | admin | contest | support
  reference_id         uuid,
  created_by           uuid,                                             -- admin actor when applicable
  created_at           timestamptz not null default now(),
  note                 text
);

create index if not exists student_credit_ledger_credit_idx
  on public.student_credit_ledger (student_credit_id, created_at desc);

create index if not exists student_credit_ledger_student_idx
  on public.student_credit_ledger (student_profile_id, created_at desc);

alter table if exists public.student_credit_ledger enable row level security;

comment on table public.student_credit_ledger is
  '087: Append-only movement log for student_credits. Tracking only in this PR — checkout does not consume these rows yet.';

-- ── admin_audit_log ─────────────────────────────────────────────────

create table if not exists public.admin_audit_log (
  id                 uuid primary key default gen_random_uuid(),
  actor_profile_id   uuid not null,                                      -- profiles.id of admin
  action             text not null,                                      -- promo_code.created | student_credit.granted | …
  target_type        text not null,                                      -- promo_code | student_credit | …
  target_id          uuid,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_profile_id, created_at desc);

create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action, created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

alter table if exists public.admin_audit_log enable row level security;

comment on table public.admin_audit_log is
  '087: General admin audit trail for promotions/credits and future admin modules. RLS deny-by-default; service-role inserts only.';

comment on column public.admin_audit_log.action is
  'Dot-namespaced action such as promo_code.created, promo_code.paused, student_credit.granted, student_credit.voided.';
