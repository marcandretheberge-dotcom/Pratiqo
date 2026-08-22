# Package / offer feature flags

Defaults are **OFF** unless the environment explicitly sets the value to `true`.

Marketplace framing: packages are **offered by independent teachers**. Pratiqo is a technology intermediary (booking + payment facilitation + platform fee). This is not legal advice.

See also:

- [`paid-packages-launch-readiness.md`](./paid-packages-launch-readiness.md)
- [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md)
- Admin: `/admin/package-launch-readiness`

## Flags

### `ENABLE_PLANNED_PACKAGES` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES`)

| | |
|--|--|
| Default | OFF |
| Runtime | Teacher offer form + teacher offers API draft/publish gates |
| Who sees effect | Teachers may draft Phase 1 planned packages (`offer_type=package`) when ON |
| Dependencies | None for drafts |
| Safe preview | ON in staging for form UX only |
| Production note | Does **not** enable public purchase, entitlements, checkout, or payouts |

### `ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS`)

| | |
|--|--|
| Default | OFF |
| Runtime | Session-draft API + gated learner UI (requires planned packages ON) |
| Who sees effect | Learners may select N sessions and create a **draft** session plan |
| Dependencies | `ENABLE_PLANNED_PACKAGES` |
| Safe preview | ON in staging with planned packages ON |
| Production note | Does **not** create bookings, Stripe checkout, entitlements, or holds |

### `NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION`

| | |
|--|--|
| Default | OFF |
| Runtime | Client + server booking create path |
| Who sees effect | Students in BookingModal when selecting a teacher offer |
| Dependencies | None |
| Safe preview | ON with snapshot checkout OFF → selection preview only (no snapshot charge) |
| Production note | Enable with snapshot checkout for real offer pricing |

### `ENABLE_OFFER_SNAPSHOT_CHECKOUT` (+ optional `NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server checkout pricing resolver |
| Who sees effect | Checkout amount for bookings with offer snapshots |
| Dependencies | Booking offer selection for creating snapshots |
| Safe preview | ON in staging with Stripe test mode |
| Production note | Required before package entitlements |

### `ENABLE_PACKAGE_ENTITLEMENTS`

| | |
|--|--|
| Default | OFF |
| Runtime | Server (webhook / paid booking success) |
| Who sees effect | Creates `package_entitlements` after paid package snapshot checkout |
| Dependencies | `ENABLE_OFFER_SNAPSHOT_CHECKOUT` |
| Safe preview | ON only with snapshot checkout ON |
| Production note | Launch-critical — keep OFF until legal checklist complete |

### `ENABLE_PACKAGE_REDEMPTION_BOOKING` (+ `NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server redeem API + BookingModal UI |
| Who sees effect | Learners redeeming a session with the same teacher |
| Dependencies | `ENABLE_PACKAGE_ENTITLEMENTS` |
| Safe preview | ON after entitlements work in staging |
| Production note | Do not enable without entitlements |

### `ENABLE_STUDENT_PACKAGE_DASHBOARD` (+ `NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server API + student nav/UI |
| Who sees effect | Students on `/student/packages` (read-only) |
| Dependencies | `package_entitlements` data existing (flag usually ON) |
| Safe preview | ON for UX review without mutating balances |
| Production note | Visibility only |

### `ENABLE_TEACHER_PACKAGE_VISIBILITY` (+ `NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server API + teacher nav/UI |
| Who sees effect | Teachers on `/teacher/packages` (read-only) |
| Dependencies | `package_entitlements` data existing |
| Safe preview | ON for UX review without mutating balances |
| Production note | Visibility only |

### `ENABLE_OFFER_POLICY_ENFORCEMENT` (+ `NEXT_PUBLIC_ENABLE_OFFER_POLICY_ENFORCEMENT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server cancel API (+ optional UI hints) |
| Who sees effect | Package-credit student cancellations use booking policy snapshots to decide automatic credit return |
| Dependencies | PR 16A preference snapshots on bookings; package redemption booking |
| Safe preview | ON in staging after package cancel/restore is validated |
| Production note | Keep OFF until teacher preferences + legal copy are ready. Does **not** create Stripe refunds |

### `PACKAGE_LEGAL_REVIEW_COMPLETED` (ops signal only)

| | |
|--|--|
| Default | unset / OFF |
| Runtime | Admin readiness helper only |
| Who sees effect | Admins on readiness page |
| Dependencies | Counsel sign-off outside the app |
| Safe preview | Leave unset |
| Production note | Set `true` only after Québec counsel review — does not auto-enable other flags |

## Safe preview combination (staging)

```
NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION=true
ENABLE_OFFER_SNAPSHOT_CHECKOUT=true
ENABLE_PACKAGE_ENTITLEMENTS=true
ENABLE_PACKAGE_REDEMPTION_BOOKING=true
ENABLE_STUDENT_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD=true
ENABLE_TEACHER_PACKAGE_VISIBILITY=true
NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY=true
```

Keep production flags OFF until legal launch checklist is complete.
