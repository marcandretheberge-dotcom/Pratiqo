# Pratiqo Engineering Hardening Roadmap

Purpose: make Pratiqo solid, refined, and maintainable as a marketplace, not a stack of feature add-ons.

## Operating Rule

Each hardening step should be small enough to validate in one pass:

1. Understand the current flow.
2. Tighten one boundary.
3. Run `npm run quality`.
4. Document what remains risky.

Do not add new product surface while a core flow is unstable.

## Priority 1: Database And Release Safety

Goal: migrations, schema, RLS, and deploys should be predictable.

Work:
- Keep migrations strictly ordered and idempotent.
- Keep public views aligned with client select lists.
- Regenerate/update Supabase types when schema changes.
- Add a DB smoke checklist for production pushes.
- Review RLS table by table, especially learner profiles, booking payments, support cases, reviews, and storage buckets.

Exit criteria:
- `npm run quality` passes.
- `supabase db push` has a known order and no surprise constraint failures.
- Public views do not expose private address, document, learner, payment, or Stripe internals.

## Priority 2: Payment Reliability

Goal: payment state must be boring, traceable, and idempotent.

Work:
- Verify lesson checkout -> webhook -> confirmed booking.
- Verify completed booking -> delayed teacher transfer.
- Verify failed transfer creates a clear admin/support state.
- Keep Pro subscription separate from lesson payments.
- Track receipt/refund/transfer status only from real Stripe events.

Exit criteria:
- No teacher payout is claimed unless a Stripe transfer exists.
- No student payment is shown as paid unless Stripe confirms it.
- Webhooks can safely receive the same event twice.

## Priority 3: Admin Operations

Goal: every manual process has a queue instead of living in memory or Supabase console clicks.

Work:
- Minimal admin queues for verification, support cases, review flags, account deletion, and payout failures.
- Add internal statuses and notes where missing.
- Add support/admin alerting for high-risk events.

Exit criteria:
- A support or verification item has a visible owner/status/next step.
- Sensitive documents remain private.

## Priority 4: Core UX Refinement

Goal: the main loop feels premium and obvious.

Core loop:
- Teacher onboarding/profile.
- Student search/profile/booking/payment.
- Post-class completion/review/support.

Work:
- Remove ambiguous labels.
- Reduce competing badges and pills.
- Improve empty states.
- Keep one primary next action per screen.
- Keep all visible strings in FR/EN/ES.

Exit criteria:
- A new student can book without confusion.
- A new teacher can become bookable without asking support.

## Priority 5: Codebase Consolidation

Goal: shared rules live in shared modules, not scattered components.

Work:
- Centralize booking statuses, payment statuses, support statuses, lesson types, and display labels.
- Centralize money/date/time formatting.
- Reduce duplicate teacher card implementations.
- Keep feature flags for Phase 2 surfaces.

Exit criteria:
- Changing a status label or business rule requires one edit, not five.

## Current Quality Gate

Run before declaring a hardening step done:

```powershell
npm run quality
```

This currently runs:

- i18n dictionary validation
- TypeScript typecheck
- production build

Warnings to clean later:

- Next.js `middleware` convention is deprecated in favor of `proxy`.
- Turbopack ignores `experimental.forceSwcTransforms`.
