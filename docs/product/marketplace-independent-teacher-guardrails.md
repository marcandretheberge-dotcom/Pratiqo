# Marketplace independent-teacher guardrails

Pratiqo is a **technology marketplace / intermediary** that lets **independent teachers** create, publish, price, and manage their own course offers and packages (forfaits).

This document is a **product/engineering guardrail** for offers, packages, checkout, booking, and package redemption. It is **not legal advice**.

```
Legal review required before public paid package launch.
Québec legal counsel should review Terms of Use, teacher terms, payment flow wording, and package policy wording before enabling paid packages broadly.
```

Do not claim the app is “legally bulletproof.” Do not add public copy saying legal review is pending.

## Core principle

Selling packages does **not** automatically make Pratiqo an employer. Risk comes from **platform control and subordination**.

Preserve:

- teacher control over the offer;
- teacher control over price;
- teacher control over number of sessions;
- teacher control over teaching method;
- teacher control over schedule/availability;
- teacher ability to teach elsewhere (no exclusivity);
- teacher economic upside/downside;
- Stripe Connect marketplace-style money flow;
- Pratiqo as intermediary/facilitator, not teaching provider.

## What Pratiqo is

Pratiqo provides:

- marketplace infrastructure;
- discovery and booking tools;
- payment facilitation;
- trust/safety layer;
- platform fee / commission processing.

## What Pratiqo must not become

Pratiqo must not accidentally behave or present itself like:

- an employer;
- a school;
- a teaching provider;
- a director of teacher work;
- a manager assigning lessons or curriculum;
- a party that pays salaries/wages;
- a seller of “Pratiqo packages” taught by assigned teachers.

## Stripe Connect money-flow guardrail

Preferred framing:

- the learner pays for a teacher’s service through Pratiqo;
- the teacher is the service provider;
- Pratiqo facilitates payment and booking;
- Pratiqo collects a platform fee / commission;
- payouts go to connected teacher accounts;
- “paiement facilité par Pratiqo” / “payment facilitated by Pratiqo”.

Avoid framing:

- Pratiqo pays salary;
- Pratiqo employs the teacher;
- Pratiqo sells its own course taught by the teacher;
- Pratiqo assigns the teacher;
- Pratiqo controls the service delivery.

Do not write code comments, metadata, admin copy, or public copy implying salary/wage/employment.

## Package builder guardrails

The teacher must control:

- whether to offer a package;
- package title;
- discipline;
- number of sessions;
- price;
- format;
- duration;
- description;
- age/level/capacity criteria;
- reasonable cancellation/rescheduling preferences when supported.

Do **not** implement:

- default mandatory “Pratiqo package”;
- platform-imposed “10 lessons for X$”;
- automatic package creation for teachers;
- forced standard price;
- forced standard curriculum;
- forced teaching method;
- teacher assignment by Pratiqo;
- exclusivity / non-compete.

## Safety/quality without subordination

Pratiqo **may** enforce marketplace rules for:

- identity / trust verification;
- marketplace safety;
- payment integrity;
- prohibited content;
- fraud prevention;
- respectful conduct;
- legal compliance;
- minimum quality standards for public listings.

Pratiqo must **not** impose employer-style control such as:

- mandatory curriculum;
- mandatory lesson scripts;
- platform-directed teaching method;
- platform-assigned students;
- platform-imposed package prices;
- platform-imposed working hours.

## Package redemption guardrails

When a learner redeems a package session:

- the session must be with the **same teacher** who sold the package;
- Pratiqo must **not** assign a different teacher automatically;
- Pratiqo must **not** impose lesson content;
- Pratiqo must **not** create a mandatory curriculum;
- the booking must respect the teacher’s availability;
- package balance changes must be **server-owned and atomic**.

## Cancellation / rescheduling

Teachers may define reasonable cancellation and rescheduling **preferences** per offer (PR 16A). Pratiqo displays those preferences and snapshots them onto bookings. Framing:

> Préférences d’annulation du professeur / Conditions proposées par le professeur

not:

> Politique Pratiqo imposée / Nos règles de cours

When a package-credit booking is cancelled or declined **before** the lesson is completed, Pratiqo restores the unused session to the teacher-sold forfait (atomic server RPC). This is not a Stripe monetary refund and not employment-style control.

```ts
// Future PR 16B: enforce cancellation/rescheduling preferences for package
// credits and paid bookings within Pratiqo marketplace safety rules.
```

Do not impose a one-size-fits-all package policy unless legally reviewed.

## Copy do / don’t

### Do

- Les professeurs inscrits sur Pratiqo
- Professeur indépendant
- Réserver avec ce professeur
- Forfait proposé par le professeur / par ce professeur
- Ce professeur propose un forfait
- Utiliser une séance du forfait avec ce professeur
- Paiement facilité par Pratiqo
- Pratiqo agit comme intermédiaire technologique
- Frais de plateforme / commission
- Versement au professeur / revenu du professeur

### Don’t

- Nos professeurs
- Nous vous offrons des cours
- Embaucher un tuteur
- Les cours de Pratiqo
- Acheter un cours Pratiqo
- Nos forfaits Pratiqo
- Acheter un forfait Pratiqo
- Pratiqo vous offre
- Pratiqo vous assigne
- Salaire / wage / employé / employee / employer (except explicit negation in legal/onboarding acknowledgements)
- Mes formules / formules (product labels)

Exception: legal Terms, teacher onboarding acknowledgements, and this guardrail doc may **negate** employment (“not an employee”) — that is intentional and allowed.

## Engineering guardrails for future PRs

1. Do not mutate package balances from UI-only code; use server-owned atomic RPCs.
2. Do not change Stripe checkout amount calculation, commission tiers, payout, transfer, or refund logic in copy-only PRs.
3. Keep feature flags OFF until legal launch checklist items are completed.
4. Prefer entitlement **snapshot** fields for historical package display (never rewrite history from live `teacher_offers`).
5. Teacher APIs must enforce ownership (`teacher_id` / `requireOwnedTeacher`).
6. Add/extend static forbidden-copy tests when introducing new package/offer surfaces.
7. Do not add public package catalog, SEO offer ranking changes, or teacher assignment in package PRs.
8. Do not introduce exclusivity, mandatory curriculum, or platform-imposed package structures.

## Legal review TODOs

Internal only — not for public UI:

- [ ] Québec legal counsel reviews Terms of Use (CGU).
- [ ] Québec legal counsel reviews teacher terms (`conditions-professeurs`).
- [ ] Counsel reviews payment / platform-fee / Stripe Connect wording.
- [ ] Counsel reviews package purchase, redemption, and credit-restore wording.
- [ ] Counsel reviews cancellation / refund interplay for packages.
- [ ] Counsel reviews tax / professional responsibility wording for teachers.
- [ ] Privacy / Law 25 implications reviewed for student/teacher package dashboards.
- [ ] Feature flags for paid packages remain OFF until review is complete.
- [ ] Marketplace copy guard tests remain green.

See also: [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md).

## Required PR report checklist

Every package/offers PR must report:

- whether teacher controls package price;
- whether teacher controls session count;
- whether teacher controls offer content/description;
- whether Pratiqo imposed any package structure;
- whether copy avoids employer/school wording;
- whether Stripe/payment wording preserves marketplace/platform-fee framing;
- whether a legal/TOS follow-up is needed.
