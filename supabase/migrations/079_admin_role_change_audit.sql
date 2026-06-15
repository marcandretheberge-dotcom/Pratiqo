-- Forensic trail for every server-side profiles.role change made through the
-- admin /admin/users surface (or any future server route that imports the
-- shared insertAdminRoleChangeAudit() helper). Inserts go through the
-- service-role client so RLS is bypassed by design; reads are denied to
-- everyone by default. Founders can grant SELECT to a specific JWT later
-- if they need a built-in viewer, but for now the table is service-role
-- only on purpose: it stores email + role transitions and shouldn't be
-- queryable from the browser.

create table if not exists public.admin_role_change_audit (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    uuid not null,                      -- profiles.id of the admin who acted
  actor_email text,                               -- snapshot at audit-time (auth.users.email)
  target_id   uuid not null,                      -- profiles.id of the user whose role changed
  target_email text,                              -- snapshot at audit-time
  previous_role text,                             -- role before the change ("student" | "teacher" | "admin" | null)
  new_role    text not null,                      -- role after the change
  reason      text,                               -- optional free-text justification
  source      text not null default 'admin/users' -- which surface produced the row
);

create index if not exists admin_role_change_audit_target_idx
  on public.admin_role_change_audit (target_id, created_at desc);

create index if not exists admin_role_change_audit_actor_idx
  on public.admin_role_change_audit (actor_id, created_at desc);

alter table public.admin_role_change_audit enable row level security;

-- Deny-by-default: no policies are created, so authenticated/anon JWTs
-- receive zero rows. Service-role bypasses RLS for inserts and any future
-- admin-side reads. This matches the spirit of migration 061's role guard:
-- only the trusted server side may touch this surface.

comment on table public.admin_role_change_audit is
  'Append-only forensic log of admin-initiated profiles.role changes. Writes are service-role only; reads are denied to all JWT roles by default.';

comment on column public.admin_role_change_audit.source is
  'Free-form tag identifying the server surface that produced the row (default admin/users).';
