# Ambassador Admin Management

This document summarizes the admin membership layer added after the
ambassador attribution and rewards foundation.

## Scope

- Existing Pratiqo teachers can be activated as ambassadors without creating a
  new account or teacher profile.
- Ambassador membership is separate from Founding Teacher, Membre Pro,
  commissions, subscriptions and teacher search ranking.
- Admins can activate, pause, reactivate or revoke membership.
- Admins can create and toggle public `/r/[code]` links.
- Admins can mark eligible ambassador rewards as manually paid.
- Marking a reward paid does not call Stripe, Stripe Connect or any automatic
  payout service.

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

Apply migration `095_ambassador_membership_admin.sql` before relying on the new
admin screens or membership-gated `/r/[code]` behavior in production.
