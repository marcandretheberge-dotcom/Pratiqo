# Paid packages — launch checklist (phased)

**Status:** Launch gate checklist. Does **not** enable flags or checkout.  
**Not legal advice.** Public launch requires `PACKAGE_LEGAL_REVIEW_COMPLETED` after real counsel review.

Related:

- [`package-product-decision.md`](./package-product-decision.md)
- [`package-technical-architecture.md`](./package-technical-architecture.md)
- [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md)
- [`paid-packages-launch-readiness.md`](./paid-packages-launch-readiness.md)
- Admin: `/admin/package-launch-readiness`

---

## Separation from standard course offers

- **Offres de cours standards** can be functional independently.
- **Forfaits payants** remain blocked until legal review and refund/payout model validation.

---

## Phase 1 — Planned packages

Required before **public** launch:

- [ ] Legal review completed (`PACKAGE_LEGAL_REVIEW_COMPLETED` only after real sign-off)
- [ ] Cancellation/refund policy approved
- [ ] Progressive payout model approved (no full up-front teacher package transfer)
- [ ] Package purchase snapshots implemented
- [ ] Session completion payout release implemented
- [ ] Admin visibility implemented
- [ ] Payout eligibility ledger synced for completed sessions
- [ ] Manual transfer execution reviewed (admin-only; no automatic payout cron)
- [ ] Manual transfer reversal reviewed (admin-only; no automatic refund)
- [ ] Staging E2E QA runbook completed (`docs/product/planned-package-e2e-staging-qa.md`)
- [ ] Student planned package dashboard reviewed (read-only; no self-serve refund)
- [ ] Teacher planned package dashboard reviewed (read-only; no teacher transfer/refund/reversal)
- [ ] Planned package dashboard polish / cross-links reviewed (no financial actions)
- [ ] Public launch gate reviewed (`docs/product/planned-package-public-launch-gate.md`)
- [ ] `ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE` remains OFF until go-live
- [ ] `PLANNED_PACKAGE_LAUNCH_MODE` set intentionally (not accidentally `public_ready`)
- [ ] Learner consent + teacher terms acknowledgment verified
- [ ] Canary allowlist verified if using `limited_teacher_canary`
- [ ] Teacher/student copy reviewed against glossary
- [ ] Package feature flags controlled (defaults OFF; staged enablement)
- [ ] Test purchase/refund scenarios completed
- [ ] Teacher Connect readiness gate before purchase
- [ ] Marketplace copy guard tests green
- [ ] Admin readiness page shows no critical blockers for intended preview env

**Rollback (public purchase only):** set both public purchase flags to `false`. Existing bookings/dashboards/admin ops remain; no financial records deleted.

**Out of Phase 1:** generic Pratiqo-wide credits; automatic abusive expiration; full up-front package payout.

---

## Phase 2 — Protected teacher credits

Required before **public** launch:

- [ ] Credit ledger
- [ ] Entitlement ledger
- [ ] Redemption ledger
- [ ] Partial refund calculator
- [ ] No-expiration policy reviewed (no growth-tactic expiry)
- [ ] Dispute workflow
- [ ] Teacher disappearance scenario
- [ ] Negative balance scenario
- [ ] Admin refund tooling
- [ ] Legal review completed
- [ ] Credits remain tied to one teacher (not transferable platform money)

---

## Phase 3 — Cohorts

Required:

- [ ] Group capacity
- [ ] Fixed dates
- [ ] Attendance
- [ ] Cancellation handling
- [ ] Minimum enrolment rules
- [ ] Teacher payout schedule
- [ ] Legal review for cohort-specific terms

---

## Explicit non-goals until gates pass

- Enabling `ENABLE_PACKAGE_ENTITLEMENTS` (or related flags) in production without checklist + legal signal
- Bypassing admin readiness blockers from the UI
- Changing commission / legacy refund / payout math without a dedicated implementation PR
