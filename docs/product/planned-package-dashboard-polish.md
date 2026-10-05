# Planned package dashboard polish

**Status:** UX polish and safe cross-linking for student, teacher, and admin planned-package surfaces.  
**Not legal advice.** Does **not** enable public package launch or financial self-serve.

Related:

- [`student-planned-package-dashboard.md`](./student-planned-package-dashboard.md)
- [`teacher-planned-package-dashboard.md`](./teacher-planned-package-dashboard.md)
- [`package-feature-flags.md`](./package-feature-flags.md)

---

## Dashboard UX principles

- One product, three roles:
  - Student: what did I buy, which sessions remain.
  - Teacher: what did I sell, what is coming, what may become payable.
  - Admin: operational/financial state (admin-only).
- Shared cards, badges, timelines, empty/loading/error states.
- Mobile-first: stacked cards, wrapping badges, no table layout on learner/teacher surfaces.
- Legal-safe copy that follows marketplace independent-teacher guardrails.

## Safe cross-linking

| From | To | Rule |
|------|----|------|
| Student package | Teacher public profile | Existing public/profile href only (`/professeurs/…` or `/teacher/profile/…`) |
| Student/teacher session | `/dashboard` | Existing owner booking surface. Dashboard already filters by the signed-in user. |
| Teacher payment warning | `/teacher/settings#payouts` | Only when payment setup is incomplete |
| Support | `info@pratiqo.ca` + `/resolution` | Canonical support address |
| Admin order | `/admin/bookings?q=` | Admin-only booking search |
| Admin order | `/admin/users/{id}` | Student user record, admin-only |
| Admin order | `/admin/package-launch-readiness` | Admin-only |

Student and teacher dashboards never link to admin routes.  
Admin does not open another person’s student/teacher dashboard (those routes stay owner-gated).

## Visibility boundaries

- Student DTO: no payout internals, no Stripe ids, no admin blockers.
- Teacher DTO: high-level eligibility/transfer labels and estimated teacher amount only.
- Admin: operational language and money-movement tools remain admin-only.

## Hidden internals

Still excluded from student/teacher UI: payment intent ids, checkout session ids, refund ids, raw transfer/reversal ids, admin notes, reconciliation blockers, platform fee internals.

## No self-serve financial actions

This polish PR does **not** add:

- learner refund execution
- teacher transfer execution
- teacher transfer reversal
- automatic payout/refund/reversal crons

UI copy states: this page does not allow any financial action.

## Feature flags

Reuse existing flags. Defaults remain **OFF**. No new production activation.

## Future

Public launch copy and legal review remain a later PR. `PACKAGE_LEGAL_REVIEW_COMPLETED` is still required before public launch.
