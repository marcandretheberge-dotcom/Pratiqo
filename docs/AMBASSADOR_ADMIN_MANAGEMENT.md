# Ambassador Admin Management

This document summarizes the admin membership layer added after the
ambassador attribution and rewards foundation.

## Scope

- Any existing Pratiqo account can be activated as an ambassador.
- A teacher profile is optional: teachers, learners and account-only community
  ambassadors all use the same ambassador membership model.
- Existing teacher ambassadors keep their teacher association automatically.
- Ambassador membership is separate from Founding Teacher, Membre Pro,
  commissions, subscriptions and teacher search ranking.
- Admins can activate, pause, reactivate or revoke membership.
- Admins can create and toggle public `/r/[code]` links.
- Admins can mark eligible ambassador rewards as manually paid.
- Marking a reward paid does not call Stripe, Stripe Connect or any automatic
  payout service.

## Identity model

- `ambassadors.user_id` is the required source-of-truth identity.
- `ambassadors.teacher_id` is optional and is populated when the account also
  has a teacher profile.
- `ambassador_links.teacher_id` is optional compatibility/reporting metadata;
  `ambassador_id` owns the link.
- Admin activation accepts an account email, profile UUID, or legacy Teacher ID.
- Someone with no Pratiqo account must create an account before activation.
- Public self-service ambassador applications are intentionally deferred.

## Membership Gate

The public referral route now requires:

- an active `ambassador_links` row, and
- an active `ambassadors` membership.

Paused or revoked memberships cannot issue new referral sessions. Historical
sessions, attributions, events, rewards and accounting remain auditable.

## Deferred Follow-Up

The current acquisition rule still uses the PR #303 new-account eligibility:
the Supabase Auth account must be created after the referral first touch and
before the session expires.

A broader "new economic acquisition" model, where an existing account that has
never produced economic value could be acquired by an ambassador, is deferred.
That change would affect attribution semantics, caps, customer support
expectations and reward accounting. It should be designed and reviewed before
implementation.

## Operations Note

Migration `095_ambassador_membership_admin.sql` remains the membership
foundation. Apply `20261031180000_ambassador_user_identity.sql` before enabling
account-only ambassadors in production.
