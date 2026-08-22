# Planned package public launch gate

**Status:** Launch gate + legal-safe copy. Does **not** enable public purchase by default.  
**Not legal advice.** Public launch requires `PACKAGE_LEGAL_REVIEW_COMPLETED` after real counsel review.

Related:

- [`paid-packages-launch-checklist.md`](./paid-packages-launch-checklist.md)
- [`package-product-decision.md`](./package-product-decision.md)
- [`package-risk-register.md`](./package-risk-register.md)
- [`planned-package-e2e-staging-qa.md`](./planned-package-e2e-staging-qa.md)
- Admin: `/admin/package-launch-readiness`

---

## Product principle (public wording)

A planned package is:

- proposed by an independent teacher;
- a defined set of scheduled sessions;
- paid through Pratiqo (facilitated payment);
- fulfilled as confirmed session bookings;
- eligible for progressive teacher transfer only after completed sessions;
- cancellable/refundable according to applicable policy and legal review;
- **not** a generic Pratiqo credit bank, expiring hour balance, or Pratiqo course program.

---

## Public launch flag

```
ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false   # default
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false   # default
```

Server must not rely only on `NEXT_PUBLIC_*`.

Public purchase also requires the full dependency chain (session drafts → preflight → holds → fulfillment → Stripe checkout → admin ops → refund quotes/review/manual refunds → payout ledger/admin view/manual transfers/reversals → student + teacher dashboards) **and** `PACKAGE_LEGAL_REVIEW_COMPLETED=true`.

---

## Launch modes (`PLANNED_PACKAGE_LAUNCH_MODE`)

| Mode | Behavior |
|------|----------|
| `disabled` (default) | No public package purchase |
| `staging_only` | Non-production QA only |
| `admin_preview` | Admin may preview copy; no draft/order/checkout mutations |
| `limited_teacher_canary` | Only allowlisted teacher/offer UUIDs |
| `public_ready` | All required flags + legal + E2E QA flag present |

Helper: `lib/offers/plannedPackagePublicLaunchGate.ts`

---

## Canary allowlist

```
PLANNED_PACKAGE_CANARY_TEACHER_IDS=uuid,uuid
PLANNED_PACKAGE_CANARY_OFFER_IDS=uuid,uuid
```

Used only in `limited_teacher_canary`. Empty allowlist ⇒ canary purchase disabled. Invalid UUIDs ignored with readiness warnings.

---

## Terms versioning

Constant: `PLANNED_PACKAGE_PUBLIC_TERMS_VERSION` (`planned_package_terms_v1_2026_08`)

- Learner consent stored on pending order (`learner_package_terms_accepted_at`, `learner_package_terms_policy_version`)
- Teacher acknowledgment on `teachers` (`teacher_package_terms_accepted_at`, `teacher_package_terms_policy_version`)
- Also written into Stripe Checkout metadata (terms version only)

Teachers may draft package offers without acknowledgment; they cannot publish package offers publicly until acknowledged.

---

## Forbidden public wording

<!-- FORBIDDEN_TERMINOLOGY_EXAMPLES_START -->
Avoid: Forfait Pratiqo, banque d’heures, crédits Pratiqo, heures expirables, nos professeurs, nos forfaits, remboursement/versement automatique garanti, salaire, employé, employeur.
<!-- FORBIDDEN_TERMINOLOGY_EXAMPLES_END -->

Admin/internal ops terms (Stripe, transfer, refund execution, etc.) remain allowed in admin surfaces.

---

## Rollback

To disable public package purchase:

```
ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
```

Expected:

- existing confirmed package bookings remain visible;
- new package purchase CTA disabled;
- admin ops remain available;
- student/teacher dashboards remain available if their flags stay ON;
- no financial records deleted;
- pending holds expire normally.

No destructive rollback scripts.

---

## Hard rules

- No default public activation
- No legal review bypass
- No automatic payout / refund / reversal crons
- No Stripe money-movement logic changes in this PR
- Student and teacher dashboards remain read-only
- Manual financial ops remain admin-only
