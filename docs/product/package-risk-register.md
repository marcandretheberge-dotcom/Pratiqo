# Package risk register

**Status:** Living risk register for paid packages / forfaits.  
**Not legal advice.** Launch blockers must be cleared before public activation.

Related: [`package-product-decision.md`](./package-product-decision.md), [`package-technical-architecture.md`](./package-technical-architecture.md).

Severity: **Critical** | **High** | **Medium** | **Low**  
Owner: Product / Engineering / Legal / Ops (primary listed)

---

| Risk | Severity | Mitigation | Launch blocker? | Owner |
|------|----------|------------|-----------------|-------|
| Teacher receives full package payout then disappears | Critical | Progressive transfers after completed sessions only; hold undelivered value on platform | **Yes** | Product + Eng |
| Student requests cancellation after partial usage | High | Approved refund policy + calculator for unused/untransferred sessions | **Yes** (Phase 1+) | Product + Legal |
| Chargeback after transfer to teacher | Critical | Separate charges/transfers; dispute hold; admin tooling; Connect readiness | **Yes** | Eng + Ops + Legal |
| Package credits treated like expiring prepaid card | High | Planned packages first; no automatic abusive expiration; glossary + copy guards | **Yes** | Product + Legal |
| Unclear responsibility between teacher and Pratiqo | High | Marketplace wording; independent teacher positioning; terms review | **Yes** | Legal + Product |
| Package bought before teacher payment readiness | High | Block purchase until Connect payout-ready | **Yes** | Eng |
| Teacher changes schedule after package purchase | Medium | Controlled reschedule rules; student notice; admin escalation | Policy dependent | Product |
| Package session not completed but credit consumed | Critical | Redeem/consume only on completion (or explicit policy event); idempotent ledger | **Yes** (Phase 2) | Eng |
| Package credit consumed twice | Critical | Idempotent redemption; unique constraints; reconciliation jobs | **Yes** | Eng |
| Package refund calculated incorrectly | Critical | Tested calculator; admin audit trail; legal-approved formulas | **Yes** | Eng + Legal |
| Legal review missing but feature flags enabled | Critical | `PACKAGE_LEGAL_REVIEW_COMPLETED` gate; readiness page; defaults OFF; no UI toggles | **Yes** | Ops + Eng |
| Misleading public copy | High | Glossary + automated copy guards; marketing review | **Yes** | Product + Legal |
| Public purchase enabled without full launch gate | Critical | `ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE` default OFF; `PLANNED_PACKAGE_LAUNCH_MODE`; readiness Public launch gate section | **Yes** | Ops + Eng |
| Canary allowlist empty or invalid while in canary mode | High | Gate blocks purchase; readiness warnings for invalid UUIDs | **Yes** (canary) | Ops + Eng |
| Learner/teacher terms not acknowledged | High | Consent on pending order + teacher publish gate + terms version constant | **Yes** | Eng + Legal |

---

## Notes

- Phase 1 (planned packages) reduces several hour-bank risks but does **not** remove refund/dispute/chargeback work.
- Phase 2 (protected teacher credits) **adds** ledger and double-spend risks — do not launch without those mitigations.
- Public launch gate docs: [`planned-package-public-launch-gate.md`](./planned-package-public-launch-gate.md).
- This register does not change Stripe, commission, payout, or entitlement mutation code by itself.
