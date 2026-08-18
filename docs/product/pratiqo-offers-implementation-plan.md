# Pratiqo Offers — Implementation Plan

**Status:** Planning / spec only  
**Companion doc:** [`pratiqo-offers-marketplace-architecture.md`](./pratiqo-offers-marketplace-architecture.md)  
**Date:** 2026-08-17

This document breaks the Offers marketplace into **12 sequential PRs**. Each PR is designed to ship independently, keep rollback paths clear, and respect hard guardrails (no accidental Stripe/payment/auth/RLS changes outside scoped PRs).

---

## PR overview

| PR | Title | DB migration | Risk |
|----|-------|--------------|------|
| 1 | Architecture docs only | No | None |
| 2 | `teacher_offers` schema + RLS + tests | Yes | Low |
| 3 | Teacher offer CRUD / admin-safe API | No* | Low |
| 4 | Teacher dashboard **Mes formules** | No | Medium |
| 5 | Teacher profile offer menu (read-only) | No | Low |
| 6 | Booking modal offer selection | No | Medium |
| 7 | Stripe checkout uses `teacher_offer_id` + snapshots | Yes | **High** |
| 8 | Admin Teacher 360 offer diagnostics | No | Low |
| 9 | Migration / backfill default offers | Yes | Medium |
| 10 | Global **Offres** catalog (gated) | No | Medium |
| 11 | Group classes / workshops | Yes | High |
| 12 | YoPratiqo offer recommendations | No | Medium |

\*PR 3 may add API routes only; schema lands in PR 2.

---

## PR 1 — Architecture docs only

### Scope

- Add architecture + implementation plan (this PR).
- No app code, migrations, or Stripe changes.

### Files likely touched

- `docs/product/pratiqo-offers-marketplace-architecture.md`
- `docs/product/pratiqo-offers-implementation-plan.md`

### DB migration needed

**No**

### Tests required

None (docs-only).

### Validation commands

```powershell
git diff --check
```

### Risk level

**None**

### Rollback strategy

Revert doc commit.

### Manual QA

- Read-through by founder/product for open decisions (§32 of architecture doc).

---

## PR 2 — `teacher_offers` schema + RLS + tests

### Scope

- Create `teacher_offers` table per architecture §26.
- RLS: teacher owner CRUD; public SELECT published + search-visible teachers only.
- Add `updated_at` trigger.
- Policy tests in `tests/security/rlsPolicyShape.test.ts` or dedicated offers RLS test file.

### Files likely touched

- `supabase/migrations/089_teacher_offers.sql` (next available number — verify at implementation time)
- `tests/offers/teacherOffersRls.test.ts` (new)
- `tests/security/rlsPolicyShape.test.ts` (extend)
- `package.json` (wire test script if needed)

### DB migration needed

**Yes** — `teacher_offers` table, indexes, RLS policies, grants.

### Tests required

- RLS: teacher can CRUD own offers; cannot touch others.
- Public/anon can read published offers for public teachers only.
- Draft/paused/archived not visible publicly.
- CHECK constraints: price minimum, package session_count.

### Validation commands

```powershell
npm run test:launch-critical
npm run test:auth
git diff --check
```

### Risk level

**Low** — additive table, no runtime reads yet.

### Rollback strategy

- Revert migration (drop table) if no downstream PRs merged.
- Safe if no production code references table.

### Manual QA

- Supabase local: insert offers as teacher; verify anon read policies via SQL or test harness.

---

## PR 3 — Teacher offer CRUD / admin-safe API

### Scope

- Server routes (or server actions) for teachers:
  - `GET /api/teacher/offers` — list own offers
  - `POST /api/teacher/offers` — create draft
  - `PATCH /api/teacher/offers/[id]` — update
  - `POST /api/teacher/offers/[id]/publish|pause|archive` — status transitions
  - `POST /api/teacher/offers/[id]/duplicate`
- Zod validation schemas mirroring DB constraints.
- Enforce discipline_id against taxonomy (`resolveDisciplineId`).
- Enforce format vs teacher capabilities (`home_lesson_enabled`, `teaching_mode`).
- **No gating** yet (or stub limits returning 403 — founder decision before merge).
- Admin: read-only list via service role optional endpoint `/api/admin/teachers/[id]/offers` (read-only).

### Files likely touched

- `app/api/teacher/offers/route.ts` (new)
- `app/api/teacher/offers/[id]/route.ts` (new)
- `app/api/teacher/offers/[id]/publish/route.ts` (new)
- `lib/offers/teacherOffers.ts` (new — mapper, validation)
- `lib/offers/types.ts` (new)
- `lib/validation/schemas.ts` (extend)
- `tests/offers/teacherOffersApi.test.ts` (new)

### DB migration needed

**No** (uses PR 2 schema).

### Tests required

- Create draft → publish → pause → archive lifecycle.
- Validation failures: price below minimum, invalid discipline, home format without home enabled.
- Authorization: cannot mutate another teacher's offer.

### Validation commands

```powershell
npm run test:launch-critical
npm run build
git diff --check
```

### Risk level

**Low** — no student-facing or payment surfaces.

### Rollback strategy

- Remove API routes; table remains unused.

### Manual QA

- curl/Postman as authenticated teacher: full CRUD cycle.
- Verify unpublished offers invisible to anon Supabase client.

---

## PR 4 — Teacher dashboard **Mes formules**

### Scope

- New nav item: **Mes formules** under teacher dashboard.
- List view: status tabs (draft / published / paused / archived).
- Create/edit wizard (client UI calling PR 3 APIs).
- Preview modal (read-only public card layout).
- Duplicate + archive actions.
- i18n: FR primary, EN/ES keys for Offers / Ofertas.

### Files likely touched

- `app/(app)/teacher/offers/page.tsx` (new)
- `app/(app)/teacher/offers/new/page.tsx` (new)
- `app/(app)/teacher/offers/[id]/edit/page.tsx` (new)
- `components/teacher/offers/*` (new)
- Teacher layout nav config
- `lib/translations/*.json` or translation source files
- `tests/teacherOffers/dashboardNavigation.test.ts` (new, static)

### DB migration needed

**No**

### Tests required

- Static tests for route registration, nav label keys, wizard validation wiring.
- Optional Playwright smoke (if project convention allows).

### Validation commands

```powershell
npm run build
npm run validate_i18n
npm run test:launch-critical
git diff --check
```

### Risk level

**Medium** — new teacher UX surface; no payment impact.

### Rollback strategy

- Hide nav link via feature flag `teacher_offers_dashboard`.
- Routes remain but unreachable.

### Manual QA

- Create private lesson + intro + package offers.
- Publish/pause; verify preview matches expected card layout.
- Mobile layout check.

---

## PR 5 — Teacher profile offer menu (read-only)

### Scope

- `TeacherProfile.tsx`: **Offres de cours** section listing published offers for teacher.
- Fetch via public-safe query (RLS) or server API returning published offers only.
- Offer cards: title, discipline, price, duration, format, type, description snippet, optional image.
- **Réserver** CTA passes `teacherOfferId` to booking flow (stub until PR 6 — can open booking with legacy behavior if offer id missing).
- Legacy fallback: if zero published offers, show existing hourly + intro UI.
- Search card “from price”: optionally `min(published offer prices)` — small change in `formatTeacherCardDisciplines` area or new helper.

### Files likely touched

- `components/TeacherProfile.tsx`
- `components/teacher/offers/OfferCard.tsx` (new, shared with PR 4 preview)
- `lib/offers/publicOffers.ts` (new — fetch published)
- `lib/teacherMapper.ts` (optional min price helper)
- `app/(app)/student/search/page.tsx` (pass offer context)
- `tests/teacherSearch/teacherProfileOffers.test.ts` (new)

### DB migration needed

**No**

### Tests required

- Profile renders offers in sort_order.
- Legacy teacher without offers still shows hourly block.
- Unpublished offers not rendered.

### Validation commands

```powershell
npm run test:launch-critical
npm run build
git diff --check
```

### Risk level

**Low** — read-only display; booking still legacy-capable.

### Rollback strategy

- Feature flag `teacher_profile_offers_menu` off → legacy pricing block.

### Manual QA

- Éloïse-style teacher with multiple offers on preview/staging.
- Verify no `—` discipline regression.
- Book button still opens modal (even if offer not yet wired).

---

## PR 6 — Booking modal offer selection

### Scope

- `BookingModal` accepts `initialOfferId?: string`.
- Step 0 or integrated header: show selected offer title, price, duration (snapshot preview from offer row).
- On insert: set `teacher_offer_id` + snapshot columns on `bookings` (requires migration in this PR or paired with PR 7 — **recommend snapshot columns in PR 6 migration**).
- Map offer_type → legacy `lesson_type` for transitional compatibility.
- Map offer format → `teaching_mode` for slot/home validation.
- Duration from offer (reduce free-form duration picker when offer fixes duration).
- Intro-once rule keyed off `offer_type_snapshot = intro_session`.

### Files likely touched

- `components/BookingModal.tsx`
- `supabase/migrations/090_booking_offer_snapshots.sql` (new columns on bookings)
- `lib/offers/bookingOfferSnapshot.ts` (new)
- `lib/pricing/bookingCharge.ts` (add offer-aware path behind flag)
- `tests/bookings/bookingOfferSelection.test.ts` (new)

### DB migration needed

**Yes** — booking snapshot columns + optional FK to `teacher_offers`.

### Tests required

- Booking insert includes snapshots matching offer at insert time.
- Changing offer price after booking does not change inserted snapshot.
- Intro session once-per-learner still enforced.

### Validation commands

```powershell
npm run test:launch-critical
npm run test:auth
npm run build
git diff --check
```

### Risk level

**Medium** — touches booking insert; checkout still legacy until PR 7.

### Rollback strategy

- Feature flag `booking_requires_offer` off → legacy lesson_type flow; nullable `teacher_offer_id`.

### Manual QA

- Book each offer type through slot selection (stop before payment if checkout not ready).
- Verify booking row snapshots in Supabase.

---

## PR 7 — Stripe checkout uses `teacher_offer_id` + snapshots

### Scope

- `/api/stripe/checkout`: when `booking.teacher_offer_id` present, charge from **snapshot columns**, not `teachers.price_per_lesson`.
- Validate offer still published at checkout time (if archived since insert, reject with clear error).
- Stripe session metadata + `booking_payments.metadata` include offer fields.
- `computeBookingChargeCents` extended with offer snapshot input (or sibling function).
- Receipt email uses offer title snapshot.
- Maintain **full legacy path** when `teacher_offer_id IS NULL`.

### Files likely touched

- `app/api/stripe/checkout/route.ts`
- `lib/pricing/bookingCharge.ts`
- `lib/payments/ledger.ts` (metadata shape)
- `lib/payments/receipts.ts`
- `app/api/stripe/webhook/route.ts` (metadata passthrough only if needed)
- `tests/payments/checkoutOfferSnapshot.test.ts` (new)
- `tests/pricing/bookingCharge.test.ts` (extend)

### DB migration needed

**Maybe** — only if `booking_payments` needs dedicated `teacher_offer_id` column; otherwise metadata JSON suffices for MVP.

### Tests required

- Checkout amount matches snapshot when offer price changed after booking insert.
- Legacy booking without offer unchanged.
- Minimum price validation on snapshot subtotal.
- Commission calculation unchanged structurally.

### Validation commands

```powershell
npm run test:launch-critical
npm run test:auth
npm run build
git diff --check
```

### Risk level

**HIGH** — payment-critical.

### Rollback strategy

- Feature flag `checkout_use_offer_snapshots` off → revert to `computeBookingChargeCents(teacher, booking)` only.
- Keep snapshot columns populated for future retry.

### Manual QA

- Stripe test mode: full checkout for each offer type.
- Verify webhook → `booking_payments` row metadata.
- Receipt email content.
- Refund path still works on offer-backed booking.

---

## PR 8 — Admin Teacher 360 offer diagnostics

### Scope

- Extend `AdminTeacher360` with:
  - `offers: { published, draft, paused, archived, total }`
  - `hasPublishedOffers: boolean`
  - Warning if zero published offers on search-visible teacher
- Read-only offer list in admin UI (title, type, price, status).
- Optional marketplace overview counter (total published offers).

### Files likely touched

- `lib/admin/teacher360.ts`
- `components/admin/Teacher360*.tsx` (or equivalent admin teacher detail page)
- `tests/admin/teacher360Offers.test.ts` (new)

### DB migration needed

**No**

### Tests required

- Teacher360 payload includes offer counts.
- Zero-offer warning on visible teacher.

### Validation commands

```powershell
npm run test:launch-critical
npm run build
git diff --check
```

### Risk level

**Low**

### Rollback strategy

- Hide admin UI section; keep data loader optional.

### Manual QA

- Admin views teacher with/without offers.
- Counts match DB.

---

## PR 9 — Migration / backfill default offers

### Scope

- One-time SQL or TS script:
  - For each active/search-visible teacher: create default `private_lesson` from `price_per_lesson` + duration + primary discipline.
  - If `intro_session_enabled`: create `intro_session` offer.
  - If `home_lesson_enabled`: optional home-format private offer.
- Status: **draft** by default OR **published** with `published_at` (founder decision — recommend **published** for seamless cutover).
- Lazy path in Mes formules for teachers missed by batch.
- Update `searchVisibilityDiagnostics` to accept offers OR legacy rate (transitional).
- **Do not remove** `teachers.price_per_lesson`.

### Files likely touched

- `scripts/backfill_teacher_offers.ts` (new)
- `supabase/migrations/091_backfill_teacher_offers.sql` (optional SQL-only seed)
- `lib/teachers/searchVisibilityDiagnostics.ts`
- `tests/offers/backfillDefaultOffers.test.ts` (new)

### DB migration needed

**Yes** — if SQL backfill; else script-only with migration for visibility rule docs.

### Tests required

- Backfill idempotent (re-run safe).
- Intro offer price matches `calculateIntroSessionPriceCents` logic.
- Teacher with existing offers not duplicated.

### Validation commands

```powershell
npm run test:launch-critical
git diff --check
```

### Risk level

**Medium** — data migration.

### Rollback strategy

- Delete offers where `source = backfill_v1` metadata flag.
- Restore visibility diagnostics to price-only.

### Manual QA

- Sample 10 teachers before/after: profile offers match legacy pricing.
- Search visibility unchanged for previously visible teachers.

---

## PR 10 — Global **Offres** catalog (inventory-gated)

### Scope

- New route `/student/offers` (+ i18n aliases).
- Structured grid/list with filters (discipline, location, format, price, type, duration, level, trust).
- Sorts: relevance, nearest, price, recent, trusted.
- Feature flag + **inventory threshold gate** (architecture Appendix B).
- Empty-filter protection: don’t launch until threshold met.
- Links to teacher profile with offer pre-selected.

### Files likely touched

- `app/(app)/student/offers/page.tsx` (new)
- `components/offers/OffersCatalog.tsx` (new)
- `lib/offers/catalogQuery.ts` (new)
- `lib/offers/inventoryThreshold.ts` (new)
- Nav / sitemap (sitemap change only when founder approves SEO)
- `tests/offers/catalogFilters.test.ts` (new)

### DB migration needed

**No** — may add read-optimized view later.

### Tests required

- Filter combinations return expected facets.
- Threshold gate blocks public access when inventory low.
- No feed/infinite-scroll anti-pattern (paginated catalog).

### Validation commands

```powershell
npm run test:launch-critical
npm run build
git diff --check
```

### Risk level

**Medium**

### Rollback strategy

- Flag off `/student/offers` → 404 or redirect to teacher search.
- Profile offer menu remains.

### Manual QA

- Filter by discipline + online; verify result quality.
- Mobile filters drawer.
- Performance on 200+ offers.

---

## PR 11 — Group classes / workshops

### Scope

- `teacher_offer_sections` table.
- Offer types: `group_class`, `workshop`, `cohort`.
- Capacity enrollment flow (may reuse patterns from `group_sessions` checkout).
- Decide: deprecate standalone `group_sessions` UI or bridge.
- Membre Pro gating for group offer types (optional).

### Files likely touched

- `supabase/migrations/092_teacher_offer_sections.sql`
- `app/api/teacher/offers/[id]/sections/*`
- `components/teacher/offers/SectionEditor.tsx`
- `app/api/offers/sections/checkout/route.ts`
- `tests/offers/groupSections.test.ts`

### DB migration needed

**Yes**

### Tests required

- Capacity cap enforcement.
- Registration idempotency.
- Refund on section cancel.

### Validation commands

```powershell
npm run test:launch-critical
npm run test:auth
npm run build
git diff --check
```

### Risk level

**High**

### Rollback strategy

- Disable group offer types at API validation layer.
- Keep 1:1 offers unaffected.

### Manual QA

- Create workshop with max 8 seats; fill and verify waitlist/cap behavior.
- Teacher cancel section → student refund path.

---

## PR 12 — YoPratiqo offer recommendations

### Scope

- Match YoPratiqo progress (`discipline`, level) → published offers.
- `self_paced_bridge` offer type support.
- Surfaces: YoPratiqo module completion CTA, optional student dashboard widget.
- **No changes** to YoPratiqo lesson content; bridge only.

### Files likely touched

- `lib/yopratiqo/offerRecommendations.ts` (new)
- `components/yo/YoOfferRecommendations.tsx` (new)
- `lib/offers/types.ts` (extend)
- `tests/yopratiqo/offerRecommendations.test.ts` (new)

### DB migration needed

**No** (unless adding bridge metadata column — optional).

### Tests required

- Recommendation ranking by discipline match.
- Privacy: no PII in offer cards.

### Validation commands

```powershell
npm run test:launch-critical
npm run build
git diff --check
```

### Risk level

**Medium**

### Rollback strategy

- Hide recommendation widget; offers still bookable manually.

### Manual QA

- Complete YoPratiqo intro module → see relevant teacher offers.
- Consent flows unchanged.

---

## Cross-cutting concerns

### Feature flags (recommended)

| Flag | PR | Purpose |
|------|-----|---------|
| `teacher_offers_dashboard` | 4 | Teacher CRUD UI |
| `teacher_profile_offers_menu` | 5 | Student profile section |
| `booking_requires_offer` | 6 | Force offer selection |
| `checkout_use_offer_snapshots` | 7 | Payment path |
| `global_offers_catalog` | 10 | Public catalog |
| `group_offer_sections` | 11 | Group/workshop |

Use existing feature flag pattern (`isEnabled()`).

### i18n keys to add (representative)

- `teacherOffersNav` → Mes formules / My offers / Mis ofertas
- `studentOffersSection` → Offres de cours / Course offers / Ofertas de cursos
- `offerTypePrivateLesson`, `offerTypeIntro`, `offerTypePackage`, `offerTypeAssessment`
- `offerFormatOnline`, `offerFormatInPerson`, `offerFormatHome`

### Validation matrix (all code PRs)

| Command | When |
|---------|------|
| `npm run test:launch-critical` | Every code PR |
| `npm run test:auth` | PRs touching API, booking, RLS |
| `npm run build` | UI/API PRs |
| `npm run validate_i18n` | UI copy PRs |
| `git diff --check` | All PRs |

---

## Inventory threshold (PR 10 gate)

Reference: architecture doc Appendix B. Implementation checklist:

- [ ] `lib/offers/inventoryThreshold.ts` computes all dimensions from live DB counts.
- [ ] Admin dashboard widget shows readiness % per dimension.
- [ ] `/student/offers` returns 503 or friendly “coming soon” until all thresholds pass.
- [ ] Soft launch: staff-only preview mode for QA before public nav link.

---

## Dependency graph

```
PR1 (docs)
  └─ PR2 (schema)
       └─ PR3 (API)
            └─ PR4 (teacher UI)
                 └─ PR5 (profile menu)
                      └─ PR6 (booking + snapshots)
                           └─ PR7 (Stripe) ◄── critical path
                                ├─ PR8 (admin)
                                └─ PR9 (backfill)
                                     └─ PR10 (catalog)
                                          └─ PR11 (group)
                                               └─ PR12 (YoPratiqo)
```

**Parallelizable after PR3:** PR4 and PR8 prep (admin read API).

**Critical path to revenue:** PR2 → PR3 → PR5 → PR6 → PR7 → PR9.

---

## Estimated timeline (indicative)

| PR | Engineering effort |
|----|-------------------|
| 1 | 0.5 day |
| 2 | 1 day |
| 3 | 1–2 days |
| 4 | 2–3 days |
| 5 | 1 day |
| 6 | 2 days |
| 7 | 2–3 days |
| 8 | 0.5–1 day |
| 9 | 1–2 days |
| 10 | 3–4 days |
| 11 | 5+ days |
| 12 | 2–3 days |

Total to MVP (PR1–7 + PR9): ~2–3 weeks focused engineering, excluding founder decision time.

---

## Success metrics

| Metric | Target (90 days post PR7) |
|--------|---------------------------|
| Search-visible teachers with ≥1 published offer | ≥ 80% |
| Bookings with `teacher_offer_id` | ≥ 70% of new bookings |
| Teachers with ≥2 offers | ≥ 30% of active teachers |
| Checkout error rate delta | &lt; 0.5% increase vs baseline |
| Support tickets “wrong price” | Decrease vs baseline |

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-17 | Initial implementation plan (PR 1) |
