# ADR: Café des langues — unified-account preparation

Status: Proposed for PR 1  
Date: 2026-11-10  
Scope: architecture contract and regression safety only; no Café runtime feature, schema migration, routing change, or deployment behavior change.

## Context

Pratiqo currently has one Supabase Auth identity per human account, but application behavior is organized around a mutually exclusive `public.profiles.role` value:

- `student`
- `teacher`
- `admin`

The future product model is broader: the same person may learn, practise in Café des langues, and teach. This ADR intentionally does **not** refactor the current role architecture. Café V1 must coexist with it safely.

## Current state analysis

### Root identity

`public.profiles.id` is a 1:1 public-schema projection of `auth.users.id` with `ON DELETE CASCADE`.

Current role source of truth is `public.profiles.role`. Auth metadata and JWT custom claims are not the source of application role.

### Role coupling

Current code assumes one active application role:

- `app/api/onboarding/select-role/route.ts` accepts `student | teacher` and refuses an existing teacher changing to student through that surface.
- `components/AuthenticatedShell.tsx` redirects students away from teacher routes and teachers away from student routes.
- `components/AppShell.tsx` renders distinct student and teacher navigation based on `profiles.role`.

Because of this coupling, Café must not initially live under `/student/*` or `/teacher/*`.

### Teacher identity and marketplace

Teacher marketplace identity is represented separately by `public.teachers.user_id -> auth.users.id`.

Existing teacher booking/payment/onboarding infrastructure is out of scope for Café V1 and must not be refactored as part of Café.

### Learner profiles

`public.learner_profiles` is not account identity. It models the person receiving instruction and can represent self, child, teen, or other. Ownership is through `owner_user_id -> auth.users.id`.

Café participation must not require a learner profile.

### Standard bookings

Existing marketplace bookings already use the root account identity for the learner:

`bookings.student_id -> auth.users.id`.

### Existing group sessions

`public.group_sessions` and `public.group_registrations` are a commercial teacher-owned domain:

- required `teacher_id`
- required price
- teacher-specific create/update/delete RLS
- registration rows linked to authenticated users
- Stripe/payment semantics

Café must not be implemented by making teacher IDs nullable or by using zero-dollar commercial sessions.

### YoPratiqo

YoPratiqo progress is persisted by authenticated root user ID in `yopratiqo_progress_snapshots.user_id`.

The API implementation is effectively role-neutral at the persistence boundary: it authenticates a user and scopes reads/writes to that same user ID. The current inline comment that states teachers cannot read the route is stricter than the route implementation; this discrepancy is documented here and is not changed in PR 1.

## Decisions

### 1. Do not refactor roles for Café V1

No `can_learn`, `can_teach`, capability enum, or role migration is introduced in PR 1.

The eventual product UI may expose an `Apprendre | Enseigner` workspace switch, but that is a later concern after Café proves useful.

### 2. Café participation is role-neutral

A current student, teacher, or future dual-capability user may participate in Café.

Café authorization must therefore be based on authenticated account ownership, not on `profiles.role = 'student'`.

### 3. Café relations should target `public.profiles(id)`

For future Café tables, participant/reservation ownership should reference `public.profiles(id)`.

Rationale:

- `profiles.id === auth.users.id`
- public-schema joins are simpler and safer through Supabase/PostgREST
- RLS can still use `auth.uid() = user_id`
- no direct client querying of the `auth` schema is required

Deletion semantics are **not** implicitly decided by this ADR. Every future Café foreign key to `public.profiles(id)` must choose and document an explicit account-deletion behavior (`ON DELETE CASCADE`, `SET NULL` plus anonymization, or another reviewed strategy) based on the data-retention purpose of that table. PR 2 must not rely on a default FK action or leave Café rows orphaned.

### 4. Café is a separate domain from commercial group sessions

Create dedicated Café tables later. Accept duplication of simple scheduling primitives such as start time, capacity, status, and reservation records.

Do not duplicate reusable infrastructure unnecessarily: notifications, room provisioning, email/calendar delivery, rate limiting, and shared time helpers should be reused or extracted where appropriate.

### 5. Initial route boundary is role-neutral

Initial public routes should live outside role-gated shells, for example:

- `/cafe`
- `/cafe/[session]`

Public visitors may browse real sessions. Authentication is required to reserve or join where appropriate.

Café conceptually belongs to the future **Apprendre** workspace even though its URL remains role-neutral.

## Café V1 domain contracts for later PRs

These are contracts, not schema introduced by PR 1.

### Session ownership

Café V1 must explicitly distinguish the session creator/manager from participants.

Initial recommendation:

- sessions are created by an admin/system scheduling surface or an explicitly authorized host
- a host is not automatically a teacher
- hosting permission is separate from marketplace teacher status
- **PR 1 does not decide that every authenticated user may host.** Open peer-to-peer hosting is a product/safety choice that requires an explicit review of moderation, abuse, trust, scheduling, and cold-start consequences before it is enabled.

The precise host authorization model must be finalized before the first Café schema migration.

### Participant projection

Café UI must never reuse an unrestricted `profiles` or `teachers` payload.

A dedicated sanitized projection/DTO must be defined before participant lists ship. Minimum principle:

```ts
type PublicCafeParticipant = {
  id: string;
  firstName: string;
  avatarUrl: string | null;
};
```

Language/level fields may be added only when explicitly required by the product surface.

Never expose email, surname by default, teacher private data, Stripe identifiers, YoPratiqo progress, child learner profiles, schedule data, or private profile metadata through the participant payload.

### Reservation abuse controls

Before public reservation launch, define and test:

- unique reservation per user/session
- per-user active/upcoming reservation limits
- rate limiting for reserve/cancel endpoints
- capacity enforcement at the database/server boundary
- cancellation behavior
- idempotency/race handling

### Safety and solicitation

V1 may rely on policy plus manual moderation rather than automated solicitation detection, but an in-session/reporting path and admin-auditable incident trail must exist before broad launch.

No teacher marketplace solicitation is permitted inside Café rooms.

## Explicit non-goals / untouchable domains for Café V1

Do not change as part of Café V1 unless a separate reviewed ADR/PR explicitly authorizes it:

- `public.profiles.role` semantics
- OAuth role assignment
- role-escalation guard migration
- teacher onboarding and verification
- Stripe Connect and teacher payout flows
- marketplace booking/payment logic
- `public.learner_profiles` semantics
- commercial `group_sessions` / `group_registrations` semantics
- YoPratiqo progression schema and scoring
- teacher-visible YoPratiqo bridge privacy model

## Regression safety contract

Before Café feature work, the following existing truths must remain pinned:

1. Existing teachers cannot be silently downgraded to student by learner intent.
2. Current student/teacher route separation remains unchanged until a dedicated workspace-switch PR.
3. YoPratiqo snapshot ownership is derived from authenticated user ID, never client-supplied user ID.
4. Existing commercial group sessions remain teacher-owned and priced.
5. Existing marketplace bookings continue to use the authenticated user identity for the learner.
6. Café must not require a learner profile or teacher record.

## Testing limitations discovered in PR 1

Current role-experience tests include useful source-contract checks, but the repository does not yet have a compact browser/HTTP harness that exercises the client-side `AuthenticatedShell` redirects as true end-to-end navigation.

PR 1 therefore pins the highest-value architectural invariants without introducing a new test framework. True Café route/reservation integration tests must be added with the Café implementation PR before deployment.

## PR 2 entry criteria

Do not begin Café schema/API implementation until all of the following are resolved:

- host/session ownership model
- sanitized participant DTO
- capacity/rate-limit/idempotency rules
- public browse vs authenticated reserve boundary
- RLS policy design for sessions and reservations
- moderation/reporting minimum viable path

PR 2 must not modify any untouchable domain listed above without separate review.
