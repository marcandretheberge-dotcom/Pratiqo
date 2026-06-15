# Pratiqo — Auth, Role & Onboarding Audit

**Last reviewed**: 2026-06-15 — alongside `feat/admin-users-role-management`.

This document is the source-of-truth for how Pratiqo assigns and changes
user roles, what the header/onboarding flow can and cannot do to a role,
and what guardrails exist in code + database against role escalation.

If you change any of the files listed in the "Pinned by tests" sections,
also update / extend `tests/auth/adminAuthorization.test.ts` and
`tests/auth/adminUsersRoleManagement.test.ts` so the contract stays loud.

---

## 1. Role source of truth

The single source of truth is the **`profiles.role`** column.

- Type: `text` enum-like, values: `"student" | "teacher" | "admin"` (mirrored
  by `ProfileRole` in `lib/auth/admin.ts`).
- Default for new rows: `"student"` (set by `resolveProfileRoleOnAuth` in
  the OAuth callback, never by user input).
- Database trigger guard: `supabase/migrations/061_profiles_role_guard.sql`
  installs `profiles_guard_role_escalation_trigger`, which blocks any
  non-`service_role` JWT from inserting or updating a row to `role = 'admin'`,
  AND prevents demoting an existing admin. This is the last line of defense
  even if every application code path were bypassed.

Auth metadata (`auth.users.user_metadata`) is read by the callback for
`full_name` / `avatar_url` / locale, but **never** for role.
Supabase JWT claims are also not used to determine `profiles.role`.

---

## 2. How each role is assigned

### Student (default)

- Created by `app/auth/callback/route.ts` after successful OAuth when the
  user is not in the admin allowlist and `?role=teacher` is NOT present.
- `resolveProfileRoleOnAuth({ existingRole: null, signUpRoleParam: null, ... })`
  returns `"student"`.

### Teacher

Only assignable through **explicit teacher-intent surfaces** — never
through a generic landing-page sign-in:

- `/become-teacher` (EN equivalent) and `/devenir-enseignant` (FR marketing)
  pages link to `/login?role=teacher`.
- The landing page's dedicated "for teachers" footer link (single link in
  `app/LandingPageClient.tsx`) also uses `/login?role=teacher`.
- `app/login/page.tsx` reads `?role=teacher` and passes `"teacher"` as the
  `signUpRole` argument to `loginWithGoogle()`, which routes it through
  Google OAuth state and back into the callback.
- The callback calls `resolveProfileRoleOnAuth({ signUpRoleParam: "teacher" })`,
  which assigns `"teacher"` only when the user has no existing admin role.
- A post-OAuth fallback path also exists at `/api/onboarding/select-role`
  for the `/onboarding?role=teacher` UI. That route hard-restricts the
  body to `"student" | "teacher"` and refuses to demote an admin.

### Admin

Admin is **never assignable from any public param, header, or onboarding
flow**. The only paths that can produce `profiles.role = 'admin'` are:

1. The user's email matches `ADMIN_LOGIN_EMAILS` (server-only env var,
   comma/semicolon/newline separated) at OAuth callback time — this is
   how the first founder admin is bootstrapped.
2. An existing admin row in `profiles` (preserved across re-auths;
   `resolveProfileRoleOnAuth` returns admin before checking the signup
   param).
3. The new `PATCH /api/admin/users` endpoint introduced in this PR, which
   requires the caller to already be an admin (see §4).
4. Direct service-role mutation (Supabase Studio, migrations, server jobs).

The database trigger from migration 061 ensures any other path — including
RLS-policy mistakes — is silently corrected back to the previous role.

---

## 3. Header / page-of-origin neutrality

**The header NEVER determines role.** The shared `components/marketing/LandingHeader.tsx`
links to `/login` with no query parameters. So does the blog header
(`components/blog/BlogPublicHeader.tsx`).

The only links that propagate `?role=teacher` are the explicit
"become a teacher" CTAs listed in §2. A user landing on the landing page,
clicking "Sign in" in the header, and completing OAuth is **always**
created as a student — even if they originally arrived from a teacher
recruitment page in a previous browser session (each OAuth round-trip
carries its own intent payload, scoped to the page that started it).

Pinned by tests:

- `landingHeaderDoesNotAssignRole` in `tests/auth/adminUsersRoleManagement.test.ts`
  asserts the universal landing header never produces `role=teacher`.
- `bridgePagesDoNotLeakTeacherIntent` in the same file asserts that the
  YoPratiqo bridge components, the blog header, and the marketplace final
  CTA all use neutral `/login` (or `/login?next=…`) links.

---

## 4. Admin users page (`/admin/users`) — what this PR added

A new admin-only surface for viewing all profiles and changing roles
without dropping into Supabase Studio.

### UI: `app/(app)/admin/users/page.tsx`

- Read-write list of profiles with email, name, role, teacher onboarding
  status, deletion-requested flag, created date.
- Per-row `<select>` to change role (student / teacher / admin).
- The acting admin's own row is rendered with a "Toi" badge and the role
  selector replaced by an "action interdite" label — defense-in-depth
  client-side, with the same restriction enforced server-side (see below).
- Confirmation dialog before every role change, with explicit before/after
  labels.
- Search box: case-insensitive partial match on email + display name.
- Page wrapped by `app/(app)/admin/layout.tsx`, which calls
  `requireAdminPage()` server-side — the security boundary is server-side,
  not the `"use client"` shell.

### API: `app/api/admin/users/route.ts`

All requests must carry `Authorization: Bearer <supabase-jwt>` and pass
`requireAdminApi()` from `lib/auth/admin.ts`.

- `GET /api/admin/users?q=<search>&limit=<n>` — paginated profile list,
  hard-capped at 250 rows, newest-first. Search input is sanitized to
  strip `%` and `,` so PostgREST `or` filters can't be split-injected.
- `PATCH /api/admin/users` — body `{ targetId, role, reason? }`.
  Validates:
  1. Caller passes `requireAdminApi`.
  2. `role` is in `ADMIN_ASSIGNABLE_ROLES` (`student | teacher | admin`).
  3. `targetId !== adminUser.id` (no self-mutation — blocks both
     self-demotion AND self-promotion attempts).
  4. Target profile exists.
  5. If `previousRole === nextRole`, returns `{ ok: true, unchanged: true }`
     without writing.
  6. Update is performed via the service-role client, then
     `insertAdminRoleChangeAudit()` writes a row to
     `public.admin_role_change_audit` (migration 079). Audit failures
     are logged but never block the role change — the role mutation is
     authoritative, the audit is best-effort with loud stderr.

### Audit table: `supabase/migrations/079_admin_role_change_audit.sql`

- Append-only.
- Columns: `id`, `created_at`, `actor_id`, `actor_email`, `target_id`,
  `target_email`, `previous_role`, `new_role`, `reason`, `source`.
- RLS enabled, **zero policies created** → only the service-role client
  can read or write. Browsers + authenticated JWTs see nothing.
- Indexes on `(target_id, created_at desc)` and `(actor_id, created_at desc)`
  for fast forensic lookups.

---

## 5. Risks found during this audit & how they're mitigated

| # | Risk | Status | Mitigation |
|---|------|--------|------------|
| R1 | Public header could embed `?role=teacher` and silently flip students to teachers | **Not present** — header is neutral | Pinned by `landingHeaderDoesNotAssignRole` test |
| R2 | OAuth callback might honour `?role=admin` from a URL | **Not present** — `resolveProfileRoleOnAuth` only matches `"teacher"` | Pinned by existing `adminAuthorization.test.ts` |
| R3 | Admin could accidentally remove their own admin role from the new UI | **Mitigated** — server returns 400 on self-mutation; UI replaces selector with locked label | New `selfMutationBlocked` test |
| R4 | Public route could submit `{ role: "admin" }` to `/api/onboarding/select-role` | **Mitigated** — route hard-validates against `"student" | "teacher"` only | Existing route guard |
| R5 | Direct INSERT to `profiles` with `role = 'admin'` via leaked anon JWT | **Mitigated** — migration 061 trigger silently rewrites to safe role | Existing test pins the SQL |
| R6 | Role change leaves no audit trail | **Mitigated** — migration 079 + `insertAdminRoleChangeAudit` | New test asserts insert call wiring |
| R7 | Admin users page might leak data to non-admin viewers | **Mitigated** — layout enforces `requireAdminPage`, API enforces `requireAdminApi`; client guard is UX only | Layout pin + API guard test |

---

## 6. Metrics & product analytics

This admin surface is **not an analytics dashboard**. Visitor counts,
funnel metrics, retention, search-quality numbers, conversion to
booking — none of that should be added here. Use PostHog (already wired
into the Pratiqo client) and Sentry for those product questions. Mixing
operational role management with marketing analytics turns this page
into a high-value target and a noisier UI for the founder.

---

## 7. Follow-up TODOs (not in this PR)

- Wire an `admin_role_change_audit` viewer (read-only, last 50 rows)
  behind `/admin/users/audit` once the founder confirms they want it
  in-browser instead of via `psql`.
- Consider a `reason` text input in the role-change confirmation dialog
  to populate the audit row's `reason` column. Optional, low priority.
- If the role allowlist ever grows beyond `student | teacher | admin`
  (e.g. `moderator`), update `ADMIN_ASSIGNABLE_ROLES`,
  `ProfileRole`, migration 061's trigger, AND the test contract — all
  three must move together.
