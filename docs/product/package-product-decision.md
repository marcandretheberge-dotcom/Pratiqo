# Package product decision

**Status:** Product decision — not a public launch.  
**Not legal advice.** Legal counsel must review before any public paid-package activation.

Related:

- [`package-technical-architecture.md`](./package-technical-architecture.md)
- [`package-glossary.md`](./package-glossary.md)
- [`paid-packages-launch-checklist.md`](./paid-packages-launch-checklist.md)
- [`package-risk-register.md`](./package-risk-register.md)
- [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md)
- [`marketplace-independent-teacher-guardrails.md`](./marketplace-independent-teacher-guardrails.md)

---

## Why packages matter

Teacher-offered packages (forfaits) can:

- improve student retention and commitment;
- give teachers more predictable revenue pipelines;
- increase marketplace transaction volume;
- clarify what is being purchased (a defined path, not a vague hour bank).

They also create **financial and legal exposure** if Pratiqo is treated as selling prepaid hours, paying teachers the full package amount up front, then remaining liable when lessons are not delivered.

## Risks of prepaid hour banks

A flexible “prepaid hours with this teacher / on Pratiqo” bank is attractive commercially but risky when:

- the teacher is paid the full package amount before delivery;
- unused hours look like platform-stored value (wallet / prepaid card);
- hours expire as a growth tactic;
- responsibility between Pratiqo and the independent teacher is unclear;
- refunds, chargebacks, and disputes hit the platform after teacher transfers.

Pratiqo must **not** become financially exposed for undelivered lessons as the default model.

## Competitor model (high level)

| Pattern | Upside | Downside for a marketplace intermediary |
|---------|--------|----------------------------------------|
| Flexible prepaid hour bank | Easy upsell | Looks like stored value; refund/dispute complexity; employer/guarantor optics |
| Planned multi-session package | Clear scope; progressive delivery | Needs scheduling discipline and refund rules |
| Generic platform credits | High liquidity | Wrong model for independent teachers; legal/financial risk |
| Fixed cohort / program | Strong product narrative | Capacity, dates, attendance, cancellation rules |

## Final Pratiqo decision

```
Pratiqo launches planned packages first.
Protected teacher credits come later.
Generic Pratiqo-wide credits are not part of the initial package launch.
No package credits should expire automatically as a growth tactic.
Teacher payout should be progressive, not fully upfront.
Public launch requires legal review completion (PACKAGE_LEGAL_REVIEW_COMPLETED).
```

### Launch phases

| Phase | Name | Public launch now? |
|-------|------|--------------------|
| **Phase 1** | Planned packages | **No** — architecture + legal first |
| **Phase 2** | Protected credits with one teacher | Later — after ledger, refund calculator, disputes, legal |
| **Phase 3** | Cohorts / fixed programs | Later |

### Phase 1 — Planned packages (first)

Example: *Préparation audition — 4 séances*

- Student buys a **specific package of sessions with one teacher**.
- Sessions are scheduled up front or through a **controlled scheduling** process.
- Teacher payout is released **progressively after each completed session**.
- No automatic abusive expiration.
- Refund/cancellation must account for **undelivered** sessions.
- Funds for undelivered sessions remain **untransferred** until completion or refund handling.

### Phase 2 — Protected teacher credits (later)

Example: *5 crédits de 60 minutes avec Sonia*

- Credits are **tied to one teacher** (not generic Pratiqo money).
- Credits are consumed only when a lesson is **completed**.
- Teacher payout only after each completed lesson.
- Unused credits need refund/cancellation handling.
- Requires ledger, refund calculator, dispute workflow, and legal approval.

### Phase 3 — Cohorts / fixed programs (later)

Examples: *Guitare débutant — 8 semaines*, *Espagnol voyage — 6 semaines*.

- Defined program with fixed dates or cohort structure.
- Capacity, attendance, minimum enrolment, and payout schedule required.

## Terminology rules

Use marketplace / intermediary wording. See [`package-glossary.md`](./package-glossary.md).

Approved direction:

- Forfait proposé par le professeur  
- Paiement facilité par Pratiqo  
- Versement au professeur après les séances complétées  
- Crédits liés à ce professeur (Phase 2 only)

Avoid employer, ownership, and guarantee language (salaire, employé, “Forfait Pratiqo”, “Nos forfaits”, etc.).

## Marketplace positioning

Pratiqo is a **technology marketplace / intermediary**.

- Packages are **proposed by independent teachers**.
- Pratiqo facilitates booking, payment, tracking, and payouts.
- Pratiqo does **not** assign teachers, employ teachers, or guarantee course outcomes.
- Standard **course offers** can function independently of paid packages.

## Teacher experience (target)

- Create a planned package offer with clear session count and scope.
- See scheduled package sessions and completion status.
- Receive progressive payouts after completed sessions — **not** full package cash up front.
- Understand cancellation/refund rules before publishing.

## Student experience (target)

- Buy a clear planned package with one teacher.
- See what is scheduled / remaining.
- Understand unused sessions and refund path (policy TBD with legal).
- Never see “hours that disappear” as a growth mechanic.

## Payment / payout principles

- Prefer **separate charges and transfers** (platform charge first; teacher transfer later).
- **Do not** transfer the full package amount up front.
- Transfer timing tied to **completed sessions**.
- Undelivered sessions stay untransferred until refund or completion path.
- Teacher Connect readiness required before package purchase is accepted (implementation later).

## Refund / cancellation principles

- Draft only: [`package-refund-cancellation-policy-draft.md`](./package-refund-cancellation-policy-draft.md).
- Must cover: before any session, partial use, unused sessions, teacher cancel / no-show, student no-show.
- Package transfer to another teacher is **not** allowed unless explicitly approved later.
- **Requires legal review before public launch.**

## Explicitly out of scope (this decision & this PR)

- Enabling package feature flags or public checkout.
- Implementing package purchase, credits, redemption, refunds, or payout release.
- Generic Pratiqo-wide credit wallets.
- Automatic expiration of package value as a growth tactic.
- Bypassing `PACKAGE_LEGAL_REVIEW_COMPLETED`.
- Changing Stripe amount, commission, payout, or refund production code in the architecture PR.
