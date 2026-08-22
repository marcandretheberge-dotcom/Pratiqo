# Planned package — end-to-end staging QA runbook

**Status:** Operational confidence harness. Does **not** enable public package launch.  
**Not legal advice.** Financial actions remain admin-only, audited, and flag-gated.

Related:

- [`package-manual-transfer-execution.md`](./package-manual-transfer-execution.md)
- [`package-manual-transfer-reversal.md`](./package-manual-transfer-reversal.md)
- [`package-manual-refund-execution.md`](./package-manual-refund-execution.md)
- [`package-payout-eligibility-ledger.md`](./package-payout-eligibility-ledger.md)
- [`paid-packages-launch-checklist.md`](./paid-packages-launch-checklist.md)
- [`planned-package-public-launch-gate.md`](./planned-package-public-launch-gate.md)
- [`planned-package-public-launch-activation.md`](./planned-package-public-launch-activation.md)
- [`planned-package-launch-monitoring.md`](./planned-package-launch-monitoring.md)
- Admin: `/admin/package-launch-readiness`
- Diagnostics API: `GET /api/admin/planned-package-e2e-qa` (requires `ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS=true`, non-production)
- Launch monitor: `/admin/planned-package-launch-monitor` (admin ops)

---

## Purpose

Prove the full planned package financial loop in **Stripe test mode / staging** before any public launch:

```
charge → fulfillment → bookings → completion → payout eligibility
→ manual transfer → cancellation → refund quote → transfer reversal → manual refund
```

This document is a QA harness. It does **not**:

- bypass legal review (`PACKAGE_LEGAL_REVIEW_COMPLETED` must still be set explicitly for production public purchase);
- create automatic payouts, refunds, or transfer reversals;
- change production Stripe behavior.

Activation profile (flags ON + `PLANNED_PACKAGE_LAUNCH_MODE=public_ready`): see [`planned-package-public-launch-activation.md`](./planned-package-public-launch-activation.md).

---

## Preconditions

1. Migrations **114–124** applied (session drafts through public terms consent).
2. Stripe **test** secret key (`sk_test_…`) configured.
3. `STRIPE_WEBHOOK_SECRET` configured for the staging webhook endpoint.
4. Teacher Connect account ready in test mode.
5. Feature flags for the lifecycle enabled **only in staging** (defaults remain OFF in production).
6. Optional: `ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS=true` for admin diagnostics (rejected in production).
7. `PACKAGE_LEGAL_REVIEW_COMPLETED` may stay unset in staging when using checkout test mode.

---

## Manual staging flow

1. Confirm migrations applied (`114`–`123`).
2. Confirm required env flags for the lifecycle (see [`package-feature-flags.md`](./package-feature-flags.md)).
3. Confirm Stripe test keys (`sk_test_`).
4. Confirm Stripe webhook endpoint configured (`checkout.session.completed` for planned packages).
5. Create teacher with Stripe Connect readiness (test mode).
6. Create planned package offer (`offer_type=package`).
7. Create session draft (N sessions).
8. Run checkout preflight — expect ready / blockers clear.
9. Create temporary holds / pending order.
10. Start Stripe Checkout in test mode.
11. Complete test payment.
12. Confirm webhook receives `checkout.session.completed`.
13. Confirm order `payment_confirmed` (then fulfillment).
14. Confirm fulfillment creates bookings (count = session count).
15. Mark one package session completed.
16. Sync payout eligibility.
17. Confirm eligible ledger entry for the completed session.
18. Execute manual transfer in test mode (admin confirmation `TRANSFER`).
19. Confirm transfer audit row succeeded + Stripe transfer id.
20. Create cancellation request.
21. Generate refund quote.
22. Confirm refund quote / refund execution blockers if unreversed transfer exists (`transfer_reversal_required`).
23. Execute transfer reversal (admin confirmation `REVERSE`).
24. Execute manual refund (admin confirmation `REFUND`).
25. Confirm final reconciliation has no unresolved critical blockers for the exercised path.

---

## Negative tests

| Case | Expected |
|------|----------|
| Flags OFF | Routes/UI blocked; no money moves |
| Expired holds | Cannot checkout |
| Duplicate webhook | Does not duplicate bookings |
| Duplicate transfer click | Idempotent — no second Stripe transfer |
| Duplicate refund click | Idempotent — no second Stripe refund |
| Duplicate reversal click | Idempotent / blocked when fully reversed |
| Refund before reversal | Blocks with `transfer_reversal_required` when unreversed transfer exists |

---

## Admin diagnostics

With `ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS=true` in staging:

- Open `/admin/package-launch-readiness` → **E2E / staging QA** section.
- Or `GET /api/admin/planned-package-e2e-qa` (admin-only).

Diagnostics show only:

- present / missing
- test / live
- configured / not configured

**No secrets** (Stripe keys, webhook secret, service role) are displayed.

The QA page/API does **not** execute transfers, refunds, or reversals.

---

## Automated smoke

```
npm run test:offers
# or directly:
npx tsx tests/offers/plannedPackageE2eLifecycle.test.ts
```

Mocks Stripe. Does not hit live Stripe or require remote Supabase.

---

## Explicit non-goals

- Automatic payout cron
- Automatic refund cron
- Automatic transfer reversal cron
- Teacher/learner self-serve money movement
- Public package launch
- Legal review bypass
