# Marketplace independent-teacher guardrails

Pratiqo is a **technology marketplace** that lets **independent teachers** create, publish, price, and manage their own course offers.

This document is a product/engineering guardrail for offers, packages, checkout, booking, and package redemption. It is **not legal advice**.

## What Pratiqo must not become

Pratiqo must not accidentally behave like:

- an employer;
- a school;
- a teaching provider;
- a director of teacher work;
- a manager assigning lessons or curriculum.

The legal risk is not caused by selling packages. The legal risk comes from **platform control and subordination**.

## What must stay true

Preserve:

- teacher control over the offer;
- teacher control over price;
- teacher control over number of sessions;
- teacher control over teaching method;
- teacher control over schedule/availability;
- teacher ability to teach elsewhere;
- teacher economic upside/downside;
- Stripe Connect marketplace-style money flow;
- Pratiqo as intermediary/facilitator, not teaching provider.

## Competitive framing (inspiration only)

### Superprof-like principle

- teacher sets their own price;
- teacher defines their own offer;
- teacher controls availability and teaching method;
- platform facilitates discovery/contact/payment tools;
- platform does not dictate lesson content or teacher schedule.

### Outschool-like principle

- platform may enforce safety/community/content standards;
- platform may approve or reject content for marketplace quality/safety;
- teacher still designs the class/offer;
- teacher sets price/session structure where product allows;
- teacher decides how to teach;
- teacher assumes risk if nobody books.

Pratiqo may enforce quality/safety rules, but must **not** dictate teaching method, curriculum, or employment-like control.

## Stripe Connect money-flow guardrail

Preferred framing:

- the learner pays for a teacher’s service through Pratiqo;
- the teacher is the service provider;
- Pratiqo facilitates payment and booking;
- Pratiqo collects a platform fee / commission;
- payouts go to connected teacher accounts.

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
- teacher assignment by Pratiqo.

### Good copy

- Ce professeur propose un forfait de 5 séances.
- Forfait proposé par le professeur.
- Réserver avec ce professeur.
- Utiliser une séance du forfait avec ce professeur.
- Paiement facilité par Pratiqo.

### Bad copy

- Nos forfaits Pratiqo.
- Acheter un forfait Pratiqo.
- Pratiqo vous offre 5 cours.
- Nos professeurs vous enseigneront.
- Embaucher un tuteur.
- Salaire du professeur.

## Package redemption guardrails

When a learner redeems a package session:

- the session must be with the **same teacher** who sold the package;
- Pratiqo must **not** assign a different teacher automatically;
- Pratiqo must **not** impose lesson content;
- Pratiqo must **not** create a mandatory curriculum;
- the booking must respect the teacher’s availability;
- package balance changes must be **server-owned and atomic**.

Good behavior: learner uses one session from a package purchased from that teacher.

Bad behavior: Pratiqo assigns any available teacher, dictates session curriculum, or forces one fixed package structure.

## Cancellation / rescheduling

Future package cancellation/rescheduling rules should be framed as:

> teacher-defined terms within Pratiqo marketplace rules

not:

> Pratiqo employment-style supervision.

```ts
// Future PR: teacher-configurable cancellation/rescheduling preferences for offers/packages,
// within Pratiqo marketplace safety and fairness rules.
```

Do not impose a one-size-fits-all package policy unless legally reviewed.

## Terms of Use follow-up (not in code PRs)

Before public paid package launch:

```
Legal TODO:
Terms must clarify that the package service contract is between the learner and the independent teacher.
Pratiqo acts as a technology marketplace/payment/booking facilitator.
Pratiqo is not the teaching provider and does not employ the teacher.
```

Do not rewrite full Terms of Use in feature PRs. Do not present this as legal advice.

## Forbidden vs allowed wording (static tests)

Forbidden in offers/packages public/admin-facing copy:

- Nos professeurs
- Nous vous offrons des cours
- Embaucher un tuteur
- Les cours de Pratiqo
- Acheter un cours Pratiqo
- Nos forfaits Pratiqo
- Acheter un forfait Pratiqo
- salaire / wage
- employé / employee / employer

Allowed framing:

- professeur inscrit
- professeur indépendant
- forfait proposé par le professeur
- réserver avec ce professeur
- intermédiaire technologique
- marketplace / plateforme
- commission / frais de plateforme
- payout

## Required PR report checklist

Every package/offers PR must report:

- whether teacher controls package price;
- whether teacher controls session count;
- whether teacher controls offer content/description;
- whether Pratiqo imposed any package structure;
- whether copy avoids employer/school wording;
- whether Stripe/payment wording preserves marketplace/platform-fee framing;
- whether a legal/TOS follow-up is needed.
