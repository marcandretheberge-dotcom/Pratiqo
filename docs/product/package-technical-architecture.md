# Package technical architecture

**Status:** Architecture decision record — **do not implement payment flows from this doc alone.**  
**Not legal advice.** Public launch requires legal review (`PACKAGE_LEGAL_REVIEW_COMPLETED`).

Related:

- [`package-product-decision.md`](./package-product-decision.md)
- [`package-feature-flags.md`](./package-feature-flags.md)
- [`paid-packages-launch-readiness.md`](./paid-packages-launch-readiness.md)
- [`package-risk-register.md`](./package-risk-register.md)

---

## Goals

Document a legal-safe, marketplace-shaped package system so engineering can implement Phase 1 (planned packages) without:

- full up-front teacher payout;
- generic Pratiqo hour banks;
- automatic abusive expiration;
- silent public launch via flags.

## Package offer types (product)

| Type | Phase | Notes |
|------|-------|--------|
| Planned package | **1** | Fixed session count with one teacher; scheduled or controlled scheduling |
| Protected teacher credits | **2** | Balance of sessions/minutes tied to one teacher |
| Cohort / fixed program | **3** | Fixed dates / capacity / attendance |

Existing `teacher_offers.offer_type = package` remains a **data shape** only until flags and legal gates allow public use.

## Phase 1 — Planned package model

### Recommended flow (document only — not implemented here)

1. Teacher creates a planned package offer.
2. Student purchases the package.
3. System creates scheduled session bookings **or** a controlled scheduling requirement.
4. Platform **captures** student payment (charge).
5. Teacher **transfer** is released after each **session completion**.
6. Undelivered sessions remain **untransferred**.
7. Cancellation/refund calculates remaining value before refund.

### Status machine (conceptual)

```
draft → published → purchased → (sessions: scheduled | pending_schedule)
  → session_completed (per session) → package_completed
  → cancelled | refunded_partial | refunded_full | disputed
```

Exact DB enums are deferred to implementation PRs.

## Phase 2 — Protected teacher credit model

- Entitlement balance tied to **one teacher_id**.
- Redemption consumes balance only on **completed** lesson (or approved policy event).
- Progressive transfer after completion.
- Partial refund calculator + dispute workflow required before launch.
- **No** generic platform wallet.

## Ledger concepts

| Ledger | Purpose |
|--------|---------|
| Purchase / charge ledger | What the student paid; Stripe IDs; snapshot of offer |
| Entitlement ledger | Sessions/minutes granted, remaining, voided |
| Redemption ledger | Each consumption event + booking link |
| Transfer ledger | Each Connect transfer amount/timing/session |
| Refund / reversal ledger | Refunds, chargebacks, credit restores |

Ledgers must be append-friendly and admin-auditable. Mutation rules live in implementation PRs — **this doc does not change mutation code.**

## Entitlement concepts

- Created after successful package purchase (when entitlements flag is intentionally enabled later).
- Stores teacher binding, total sessions, remaining, source offer snapshot.
- Never a transferable Pratiqo cash balance.

## Redemption concepts

- Links a booking/session to an entitlement decrement.
- Idempotent; double-redeem is a critical failure mode (see risk register).
- Incomplete lessons must not silently consume credits without policy.

## Refund / cancellation concepts

- Compute **untransferred / unused** value before refunding.
- Do not assume full refund after partial delivery without policy.
- Align with draft: [`package-refund-cancellation-policy-draft.md`](./package-refund-cancellation-policy-draft.md).

## Payout release concepts

- **Progressive** transfers after completed sessions.
- Cap cumulative transfers at purchased package value minus fees/refunds.
- Never “pay full package then hope sessions happen.”

## Stripe Connect model

### Preferred: separate charges and transfers

```
Preferred model: separate charges and transfers.
Platform charges the student first and transfers to the connected teacher later.
```

Reasons:

- Undelivered sessions can remain untransferred.
- Refunds/disputes can be handled before or against remaining platform-held funds (policy + ops dependent).
- Aligns with intermediary positioning.

### Important warnings (do not implement in this PR)

- Do **not** transfer the full package amount up front.
- Payout should be tied to **completed sessions**.
- Refunds, disputes, and chargebacks must be accounted for.
- Admin tooling is required before public launch.
- Do **not** change Stripe checkout amount calculation, commission, or payout production logic in the architecture PR.

### Transfer timing

| Event | Transfer |
|-------|----------|
| Package purchased | Charge captured; **no** full package transfer |
| Session completed | Transfer session share (minus platform fee rules) |
| Session unused / cancelled per policy | No transfer / clawback / refund path per policy |
| Package fully delivered | Cumulative transfers ≈ entitled teacher share |

## Feature flags

All default **OFF** unless env is explicitly `"true"`. See [`package-feature-flags.md`](./package-feature-flags.md).

Critical:

- `ENABLE_PACKAGE_ENTITLEMENTS`
- `ENABLE_PACKAGE_REDEMPTION_BOOKING`
- `ENABLE_STUDENT_PACKAGE_DASHBOARD` / UI twin
- `ENABLE_TEACHER_PACKAGE_VISIBILITY` / UI twin
- `ENABLE_OFFER_SNAPSHOT_CHECKOUT`
- `NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION`
- `PACKAGE_LEGAL_REVIEW_COMPLETED` — **ops signal only**; never flipped by UI

This architecture PR **must not** set any of these to enabled.

## Admin readiness gates

- Page: `/admin/package-launch-readiness`
- Helper: `lib/offers/packageLaunchReadiness.ts`
- `PACKAGE_LAUNCH_NEVER_PRODUCTION_READY = true`
- Missing `PACKAGE_LEGAL_REVIEW_COMPLETED` keeps legal blocker visible
- Standard course offers can work separately; paid packages stay blocked until legal + refund/payout model validation

## Failure modes (non-exhaustive)

- Double redemption
- Transfer after refund
- Charge without entitlement
- Entitlement without charge
- Teacher Connect not ready at purchase
- Session marked complete without lesson delivery
- Partial refund miscalc
- Flags ON without legal signal

## Dispute handling TODO

- Admin hold on further transfers
- Evidence of completed vs unused sessions
- Chargeback playbook after teacher transfer
- Student/teacher messaging templates (marketplace wording)

## Legal review TODO

- Terms / teacher terms / package refund policy
- Stored-value vs services characterization
- Québec counsel sign-off → `PACKAGE_LEGAL_REVIEW_COMPLETED=true` only after real review
- Copy audit against glossary
