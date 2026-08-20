# Paid packages — legal launch checklist

Internal launch gate only. This document does **not** block runtime behavior and is **not legal advice**.

```
Legal review required before public paid package launch.
Québec legal counsel should review Terms of Use, teacher terms, payment flow wording, and package policy wording before enabling paid packages broadly.
```

Do not claim the product is legally complete. Do not show “pending legal review” copy to end users.

## Checklist

- [ ] Québec legal counsel reviewed Terms of Use / Conditions d’utilisation.
- [ ] Québec legal counsel reviewed teacher terms (`conditions-professeurs`).
- [ ] Terms state Pratiqo is a marketplace / technology intermediary.
- [ ] Terms state teachers are independent service providers (not employees).
- [ ] Terms state the teaching service / package relationship is between learner and teacher.
- [ ] Terms state Pratiqo facilitates discovery, booking, and payment.
- [ ] Terms state teacher controls price, packages, availability, and teaching method.
- [ ] Terms state no exclusivity (teachers may teach elsewhere).
- [ ] Terms distinguish marketplace safety/quality rules from teaching-method control.
- [ ] Stripe Connect / platform fee / commission wording reviewed.
- [ ] Package cancellation / rescheduling / credit-restore wording reviewed.
- [ ] Tax and professional responsibility wording for teachers reviewed.
- [ ] Refund / cancellation wording reviewed for paid packages and package-credit bookings.
- [ ] Privacy / Law 25 implications reviewed for student and teacher package dashboards.
- [ ] Feature flags for paid package purchase / redemption / dashboards remain **OFF** until review completes.
- [ ] Marketplace independent-teacher copy guard tests are passing.
- [ ] No “Nos forfaits Pratiqo”, salary/employer, or teacher-assignment wording in product copy.
- [ ] Product still lets teachers control package price, session count, and content (no imposed Pratiqo package structure).

## Related docs

- [`marketplace-independent-teacher-guardrails.md`](./marketplace-independent-teacher-guardrails.md)
- [`paid-packages-launch-readiness.md`](./paid-packages-launch-readiness.md)
- [`package-feature-flags.md`](./package-feature-flags.md)
- Live Terms: `content/legal/terms.{fr,en,es}.md`
- Teacher terms: `content/legal/conditions-professeurs.{fr,en,es}.md`
- Payments policy: `content/legal/paiements-remboursements.{fr,en,es}.md`

## Enabling paid packages (ops)

When counsel signs off, enable only the flags required for the approved surface area, then re-run:

- `npm run test:offers`
- marketplace copy guard tests
- manual QA for Terms, teacher offers, student packages, and checkout wording
