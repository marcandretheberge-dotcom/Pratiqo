# Pratiqo Offers — Marketplace Architecture

**Status:** Planning / spec only — no runtime code, migrations, or Stripe changes in this PR  
**Branch:** `product/teacher-offers-marketplace-architecture`  
**Date:** 2026-08-17  
**Audience:** Product, engineering, admin ops, legal/compliance

---

## Naming conventions

| Context | Label |
|---------|-------|
| Internal concept / table | `teacher_offers` |
| Teacher-facing (FR) | **Mes formules** |
| Student-facing (FR) | **Offres de cours** |
| Short nav (later) | **Offres** |
| English | Offers / Course offers |
| Spanish | Ofertas / Ofertas de cursos |

**Do not use:** ads, annonces, posts, Facebook posts, classifieds. This is a structured learning marketplace, not a social feed.

---

## 1. Executive summary

Pratiqo today models marketplace supply as **one teacher profile = one hourly rate + optional intro session + optional home rate**. That works for early supply but caps differentiation: a piano teacher who offers a 30-minute trial, a 5-lesson package, and a diagnostic assessment still appears as a single “$X/h” card.

**Pratiqo Offers** (`teacher_offers`) introduces a **transactional catalog layer** on top of the existing **trust layer** (teacher profile, verification, reviews, availability). Teachers publish structured **formules / offres**; students choose an offer before booking; checkout snapshots offer terms so later price edits never rewrite history.

**Recommended first ship:** Phase 1 **Course Menu MVP** — offers visible on the teacher profile only, bookable through the existing booking + Stripe flow, with legacy `teachers.price_per_lesson` kept as fallback until inventory and checkout fully cut over.

---

## 2. Why Pratiqo needs offers / formules

- **Supply-side differentiation:** Teachers compete on pedagogy and packaging, not only hourly rate.
- **Student clarity:** “Book intro session” vs “Book 5-lesson package” is clearer than inferring lesson type from toggles.
- **Monetization hooks:** Offer count, analytics, featured placement, and group-class capacity become natural Membre Pro levers without touching commission math in MVP.
- **Discovery evolution:** Enables a future **offer-first** catalog (`/student/offers`) without rebuilding payments.
- **Operational truth:** Admin and receipts can reference a stable offer title instead of “Cours” vs “Séance d’introduction” inferred from `lesson_type`.

---

## 3. Current product limitation

### Code audit summary (main @ 2026-08-17)

| Area | Current behavior |
|------|------------------|
| **Pricing source of truth** | `teachers.price_per_lesson`, `default_lesson_duration_minutes`, `intro_session_*`, `home_lesson_*` columns |
| **Disciplines** | Flat taxonomy in `lib/taxonomy/disciplines.ts`; up to 5 rows in `teacher_disciplines` with optional `specialite` |
| **Teacher card / profile** | Single “from $X/h”; intro block when `intro_session_enabled`; disciplines via `disciplineDisplay` |
| **Booking creation** | `BookingModal` inserts `bookings` client-side with `lesson_type` (`regular` \| `intro`), `teaching_mode`, `duration_minutes`, client-computed `price` |
| **Charge authority** | `computeBookingChargeCents()` in `lib/pricing/bookingCharge.ts` **re-derives** amount from teacher row — never trusts client `bookings.price` |
| **Stripe checkout** | `/api/stripe/checkout` loads booking + teacher, validates slot, applies credits, computes commission via `calculateBookingAmounts()` |
| **Ledger** | `booking_payments` with `subtotal_cents`, `platform_fee_cents`, `tax_snapshot`, `metadata` |
| **Group classes** | Separate `group_sessions` + `group_registrations` tables; feature-flagged (`group_sessions`); not integrated with 1:1 booking flow |
| **Search visibility** | `searchVisibilityDiagnostics` requires valid `price_per_lesson` + discipline |
| **Admin** | Teacher 360 exposes hourly rate, intro session, disciplines — no offer inventory |

### Structural gap

There is **no first-class catalog entity**. Lesson semantics are spread across:

- `bookings.lesson_type` (`regular` / `intro`)
- `bookings.teaching_mode` + duration
- Teacher-level intro/home toggles

Packages, assessments, workshops, and multi-session products **cannot be represented** without bolting fields onto `teachers` or inventing ad-hoc booking metadata.

---

## 4. Target marketplace model

```
┌─────────────────────────────────────────────────────────────┐
│                     TRUST LAYER                             │
│  Teacher profile · verification · reviews · availability    │
│  Location (approx) · languages · trust badges               │
└──────────────────────────┬──────────────────────────────────┘
                           │ 1:N
┌──────────────────────────▼──────────────────────────────────┐
│                  TRANSACTIONAL LAYER                          │
│  teacher_offers (formules / offres)                           │
│  - title, discipline, type, format, price, duration           │
│  - package/session semantics · capacity (later)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ booking references offer + snapshot
┌──────────────────────────▼──────────────────────────────────┐
│                  FULFILLMENT LAYER                            │
│  bookings · booking_payments · receipts · refunds             │
│  group offer sections (Phase 2+)                                │
└─────────────────────────────────────────────────────────────┘
```

**Principle:** Profiles sell **trust**; offers sell **specific learning products**.

---

## 5. Teacher-first discovery vs offer-first discovery

| Entry point | Today | Target |
|-------------|-------|--------|
| **Find a teacher** | `/student/search` — map + filters on teacher | Unchanged; card may show “from $X” derived from cheapest published offer |
| **Find an offer** | Not available | Phase 10+: `/student/offers` structured catalog |
| **Deep link** | Teacher profile modal | Profile **Offres de cours** menu → pick offer → book |

Both paths converge on the same booking + checkout pipeline once an offer is selected.

---

## 6. Why not a Facebook-style feed

- **Wrong mental model:** Parents and adult learners want **schedules and prices**, not an infinite scroll of posts.
- **Trust requirements:** Verification, cancellation policy, and Stripe Connect readiness apply to **teachers**, not individual posts.
- **SEO/discovery:** Structured filters (discipline, price, format) outperform unstructured chronology.
- **Compliance:** Receipts, tax snapshots, and refund audit trails require **stable product definitions**, not editable feed items.
- **Moderation cost:** A feed invites spam, off-platform solicitation, and inconsistent pricing — all already guarded against in teacher onboarding.

---

## 7. Why structured filterable catalog wins

- Matches how marketplaces like Airbnb Experiences, Wyzant service listings, and ClassPass-style inventory work: **SKU-like offers** with facets.
- Enables **empty-state-safe** global catalog (inventory thresholds per discipline/region — see § rollout).
- Powers admin diagnostics (“teachers with zero published offers”).
- Aligns with existing Pratiqo investments: flat discipline taxonomy, PostGIS teacher search, Stripe ledger.

---

## 8. Student experience

### Phase 1 (profile menu)

1. Discover teacher via search/map (unchanged).
2. Open profile → section **Offres de cours** lists published offers as cards.
3. Each card: title, discipline chip, price, duration, format badge, type badge, short description, optional image.
4. Tap **Réserver** on an offer → `BookingModal` opens with **offer pre-selected** (title + price snapshot shown).
5. Pick date/slot/preferences → checkout uses server-side offer validation.

### Later (global catalog)

- Browse `/student/offers` with filters; land on offer detail or teacher profile with offer highlighted.
- Sort by relevance, distance, price, recency, trust signals.

### UX copy

- Use **Offres de cours** student-facing (not “Annonces”).
- Booking confirmation and emails use **offer title snapshot**, e.g. “Forfait 5 cours de piano — 60 min”.

---

## 9. Teacher experience

### Dashboard: **Mes formules**

| Action | MVP | Later |
|--------|-----|-------|
| Create offer (wizard) | ✓ | |
| Draft / published / paused | ✓ | |
| Preview (public view) | ✓ | |
| Edit | ✓ | |
| Duplicate | ✓ | |
| Archive | ✓ | |
| Analytics per offer | | Membre Pro |
| Featured boost | | Membre Pro / paid |

### Wizard fields (MVP)

- Title, discipline (from taxonomy), optional specialty text
- Offer type: private lesson, intro session, package, assessment
- Format: online / in person / home (subset gated by teacher capabilities)
- Price, duration, optional description, optional image
- For packages: `session_count` (e.g. 5)

### Gating (document only — not implemented in spec PR)

See §17–18 for recommended limits.

---

## 10. Admin experience

### Teacher 360 extensions (Phase 8)

- **Offer inventory:** count by status (draft / published / paused / archived).
- **Diagnostics:** flag teachers with zero published offers (supply risk).
- **Read-only list:** title, type, price, status, last updated.
- **No admin mutation in MVP** unless later required for moderation.

### Marketplace overview (future)

- Aggregate: total published offers, offers per discipline, teachers with ≥2 offers.

---

## 11. Profile page offer menu

Replace implicit “hourly + intro toggle” pricing block with an **Offres de cours** section:

```
┌─────────────────────────────────────────┐
│ Offres de cours                         │
├─────────────────────────────────────────┤
│ [Card] Cours privé — Piano              │
│        60 min · En ligne · 55 $         │
│        [Réserver]                       │
├─────────────────────────────────────────┤
│ [Card] Séance d'introduction            │
│        45 min · 30 $                    │
│        [Réserver]                       │
├─────────────────────────────────────────┤
│ [Card] Forfait 5 cours                  │
│        5 × 60 min · 250 $               │
│        [Réserver]                       │
└─────────────────────────────────────────┘
```

**Legacy fallback:** If teacher has no published offers, show current hourly + intro UI driven by `teachers.*` columns.

**Card price display on search:** “À partir de {min published offer price}” once offers exist; else legacy `pricePerLesson`.

---

## 12. Future global offers catalog

**Routes (planned, not MVP):**

- `/student/offers` (EN: `/offers` or locale-aware)

**Not a feed.** Grid/list with facets:

| Filter | MVP catalog | Later |
|--------|-------------|-------|
| Discipline | ✓ | |
| Location / radius | ✓ | |
| Format (online/in person/home) | ✓ | |
| Price range | ✓ | |
| Type (private / package / intro / assessment) | ✓ | |
| Duration | ✓ | |
| Level | ✓ | |
| Teacher trust badges | ✓ | |
| Date/time | | group sections |
| Starting soon | | sections |

**Sorts:** relevance (default), nearest, price low/high, recently added, trusted score, starting soon (later).

**Launch gate:** See implementation plan — multi-dimensional inventory threshold, not a single global number.

---

## 13. Map / location behavior

### Phase 1

- **No change** to map pins — still **teacher locations**.
- Offers inherit teacher approximate location for display; **never expose private address** on offer cards.

### Future catalog + map

- Option A: Map shows teachers; selecting pin → profile offers menu.
- Option B: Map shows offer pins at teacher coordinates (same point, different card) — only when density supports it.
- **Home offers:** Show “À domicile — {city/region}” without street address until booking confirmed (same as today).

PostGIS and `teachers_public` visibility rules remain unchanged in MVP.

---

## 14. Search / filter behavior

### Teacher search (unchanged MVP)

- Filters continue to operate on **teacher** attributes (discipline, price band, mode, etc.).
- **Price band** should eventually derive from **min/max published offer prices**; interim: legacy `price_per_lesson` with offer overlay in Phase 5+.

### Offer-aware matching

- `teacher_disciplines` + per-offer `discipline_id` allow a teacher to appear in discipline X via either profile disciplines or an offer tagged X.
- Recommendation: offer discipline must be ⊆ teacher’s selected disciplines (or auto-add with teacher confirmation).

### Global offer search (Phase 10)

- Query `teacher_offers` JOIN `teachers_public` WHERE `status = published` AND teacher search-visible.
- Full-text on title + description; facet indexes on `discipline_id`, `offer_type`, `format`, `price_cents`.

---

## 15. Offer types

| `offer_type` | Description | MVP |
|--------------|-------------|-----|
| `private_lesson` | Standard 1:1 slot-based lesson | ✓ |
| `intro_session` | First-time / diagnostic intro | ✓ |
| `package` | Multi-session bundle (single checkout or ledger — see open decisions) | ✓ |
| `assessment` | Evaluation / placement session | ✓ |
| `workshop` | Short group-ish event | Phase 11 |
| `group_class` | Recurring or dated group enrollment | Phase 11 |
| `cohort` | Fixed cohort with min enrollment | Phase 11 |
| `self_paced_bridge` | YoPratiqo path → teacher offer bundle | Phase 12 |

### Formats (`format`)

| Value | Maps from |
|-------|-----------|
| `online` | `teaching_mode` online |
| `in_person` | studio / in-person |
| `home` | domicile — requires `home_lesson_enabled` |
| `hybrid` | teacher allows choice at booking (later) |

---

## 16. Pricing and monetization

### Offer-level pricing

- `price_cents` + `currency` on each offer.
- Packages: either **total package price** (`session_count` × implied per-session) or explicit total — recommend **total price for package** in MVP (simpler checkout).
- Intro/assessment: flat session price (not hourly-derived), though migration may seed from existing intro formula.

### Platform commission

- **Unchanged formula** in MVP: `calculateBookingAmounts()` on **booking subtotal** from offer snapshot.
- Package note: entire package subtotal at checkout vs per-session billing is a founder decision (§32).

### Credits

- Existing student credits apply to offer checkout subtotal same as today (`credits_to_apply` in checkout).

### Paid boosts / featured offers

- Non-MVP; Membre Pro later.

---

## 17. Founder / Pro / free gating

| Tier | Recommended offer limit | Rationale |
|------|-------------------------|-----------|
| **Free** | **3 published offers** | Enough for private + intro + one package; avoids single-offer straitjacket; low moderation burden |
| **Prof fondateur** | **10 published** (or unlimited during founder window) | Reward early supply; align with founder commission promo |
| **Membre Pro** | **Unlimited** + analytics + featured (later) + group classes (later) | Clear upgrade story |
| **Business / org** | Team offers, cohorts | Post-MVP |

**Launch policy recommendation:** Start **generous** (free = 3, founder = 10) to avoid suppressing supply during catalog cold start. Tighten only after global catalog launch and inventory metrics justify it.

**Do not implement gating in architecture PR.**

---

## 18. Membre Pro implications

Existing Membre Pro value props (`lib/config/membrePro.ts`): lower commission tiers, higher active student limit.

**Additive Pro benefits (offers era):**

- Unlimited published offers
- Offer-level analytics (views, bookings, conversion)
- Featured offer placement in catalog (later)
- Group class / workshop offer types (later)
- Lower commission already applies to all bookings regardless of offer

**No change** to Stripe subscription flow in MVP.

---

## 19. Booking flow impact

### Current flow

```
BookingModal → insert bookings (pending_payment)
  → POST /api/stripe/checkout { booking_id }
  → Stripe Checkout → webhook → booking_payments + confirmed
```

### Target flow

```
Select offer on profile
  → BookingModal(teacherOfferId)
  → insert bookings with teacher_offer_id + snapshot columns
  → POST /api/stripe/checkout { booking_id, teacher_offer_id }
  → server validates offer published + belongs to teacher
  → computeBookingChargeCents from OFFER snapshot (not teachers.price_per_lesson)
```

### Booking table additions (proposed)

```sql
-- New columns on bookings (Phase 6–7)
teacher_offer_id uuid REFERENCES teacher_offers(id),
offer_title_snapshot text,
offer_type_snapshot text,
offer_format_snapshot text,
offer_price_cents_snapshot integer,
offer_currency_snapshot text,
offer_duration_minutes_snapshot integer,
offer_session_count_snapshot integer,  -- packages
offer_discipline_id_snapshot text,
```

### Snapshot fields (immutable after booking insert)

| Field | Used by |
|-------|---------|
| `offer_title_snapshot` | Emails, receipts, admin, student history |
| `offer_price_cents_snapshot` | Stripe subtotal, ledger, refunds |
| `offer_duration_minutes_snapshot` | Agenda, reminders, buffer overlap |
| `offer_currency_snapshot` | Stripe, receipts |
| `offer_type_snapshot` | Intro-once rules, package fulfillment |
| `offer_session_count_snapshot` | Package UI, future multi-session tracking |
| `offer_format_snapshot` | Mode validation, address requirement |
| `offer_discipline_id_snapshot` | Reporting, YoPratiqo bridge context |
| Commission basis points at checkout | Already in Stripe metadata → `booking_payments.metadata` |

**Rule:** Never re-read live `teacher_offers.price_cents` for an existing booking.

### Legacy mapping

| Legacy | Offer type |
|--------|------------|
| `lesson_type = regular` | `private_lesson` |
| `lesson_type = intro` | `intro_session` |
| `teaching_mode = domicile` | `format = home` |

Keep `lesson_type` during transition; deprecate after backfill.

---

## 20. Stripe / payment impact

### Checkout evolution (Phase 7)

1. Accept optional `teacher_offer_id` in request body (validated against booking).
2. Load offer server-side; assert `status = published`, not paused/archived.
3. Assert offer.`teacher_id` = booking.`teacher_id`.
4. Compute subtotal from **offer snapshot** on booking row (or offer row at insert time).
5. Pass offer context in Stripe session metadata:

```json
{
  "booking_id": "...",
  "teacher_offer_id": "...",
  "offer_title": "...",
  "offer_type": "package",
  "subtotal_cents": "25000",
  "platform_fee_cents": "...",
  "commission_source": "standard|founder_promo|paid_pro"
}
```

6. `upsertUnpaidBookingPayment` stores `teacher_offer_id` in `metadata`.

### Webhook (`checkout.session.completed`)

- Continue deferring tax finalization to existing `lib/payments/tax.ts` paths.
- Ledger row must include offer snapshot for admin exports.

### Connect / transfer

- Unchanged: transfer after completion based on `teacher_net_cents`.

**Hard guardrail:** Do not modify Stripe code in architecture PR.

---

## 21. Tax / receipt / ledger impact

### Tax (`lib/payments/tax.ts`)

- Stripe Tax calculated on checkout session subtotal derived from offer snapshot.
- `tax_snapshot` JSON on `booking_payments` remains authoritative.
- Offer title appears on customer-facing receipt email (`lib/payments/receipts.ts`) — extend template to prefer `offer_title_snapshot` over generic “Cours”.

### Receipts

- Line item: `{offer_title_snapshot}` — `{duration} min`
- Package: “Forfait {session_count} séances — {offer_title_snapshot}”

### Ledger / admin

- `booking_payments.metadata.teacher_offer_id` for reporting.
- Future: offer-level revenue rollups for Membre Pro analytics.

---

## 22. Cancellation / refund impact

### Current (`lib/payments/refunds.ts`)

- Full refund of `booking_payments.amount_cents` via Stripe PI.
- 24h cancellation rule via `isBookingAtLeast24hAhead`.

### With offers

- Refund amount still tied to **paid snapshot**, not current offer price.
- **Package partial refunds:** Non-MVP — treat package as single charge; cancellation policy TBD (open decision).
- Intro-once rule: enforce via `offer_type_snapshot = intro_session` + existing learner profile check.

---

## 23. Group class / capacity impact

### Existing `group_sessions`

- Parallel system: `title`, `date`, `time`, `max_participants`, `price_per_person`, separate checkout (`/api/group-sessions/checkout`).
- Feature-flagged; not unified with 1:1 offers.

### Recommendation

| Phase | Approach |
|-------|----------|
| **MVP** | **Exclude** group classes from offers |
| **Phase 11** | Introduce `teacher_offer_sections` linked to `teacher_offers` where `offer_type IN ('group_class','workshop','cohort')` |
| **Migration** | Optionally deprecate raw `group_sessions` in favor of offer-backed sections long-term |

### Proposed `teacher_offer_sections`

```sql
CREATE TABLE teacher_offer_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES teacher_offers(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  recurrence_rule text,          -- iCal RRULE or internal JSON
  capacity_max integer NOT NULL,
  capacity_taken integer NOT NULL DEFAULT 0,
  min_enrollment integer,
  status text NOT NULL DEFAULT 'open',
  registration_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Do not implement in MVP** unless product explicitly promotes group as launch pillar (not recommended — high complexity).

---

## 24. YoPratiqo integration

### Today

- `YoBookingTeacherBridgeConsent` in `BookingModal` shares progress snapshot with teacher on booking.
- YoPratiqo modules are self-paced; teacher bridge is post-module CTA.

### Phase 12 vision

- **`self_paced_bridge` offer type:** Bundles YoPratiqo module completion → discounted first live lesson.
- Offer carries `discipline_id` aligned with module language/subject.
- Recommendation engine: “Based on your YoPratiqo progress, these offers match” — queries published offers by discipline + level.

**MVP:** No YoPratiqo code changes. Ensure offer snapshots include `discipline_id` for future matching.

---

## 25. SEO / local discovery impact

### Phase 1

- **No new indexable offer URLs** (profile-only menu).
- Teacher SEO pages unchanged.

### Later

- Optional offer detail pages: `/prof/{slug}/offres/{offer-slug}` — indexable if founder approves (open decision).
- Structured data: `Course` / `Offer` schema.org JSON-LD per offer.
- Local landing pages can aggregate offers by discipline + city once global catalog exists.

**Guardrail:** Do not touch sitemap/robots in offers MVP PRs.

---

## 26. Data model proposal

### `teacher_offers`

```sql
CREATE TABLE public.teacher_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  title text NOT NULL,
  slug text,                              -- unique per teacher; optional MVP
  description text,

  discipline_id text,                     -- FK to taxonomy id (text, no DB FK)
  specialite text,

  offer_type text NOT NULL,               -- see §15 enum
  format text NOT NULL,                   -- online | in_person | home | hybrid

  status text NOT NULL DEFAULT 'draft',   -- draft | published | paused | archived

  image_url text,

  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'cad',

  duration_minutes integer NOT NULL,
  is_group boolean NOT NULL DEFAULT false,
  is_package boolean NOT NULL DEFAULT false,
  session_count integer,                  -- required when is_package

  capacity_min integer,
  capacity_max integer,

  level text,
  age_min integer,
  age_max integer,

  location_mode text,                     -- mirrors format semantics; optional denormalized helper

  requires_identity boolean NOT NULL DEFAULT false,
  requires_manual_confirmation boolean NOT NULL DEFAULT false,

  sort_order integer NOT NULL DEFAULT 0,

  published_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT teacher_offers_status_check
    CHECK (status IN ('draft','published','paused','archived')),
  CONSTRAINT teacher_offers_offer_type_check
    CHECK (offer_type IN (
      'private_lesson','intro_session','package','assessment',
      'workshop','group_class','cohort','self_paced_bridge'
    )),
  CONSTRAINT teacher_offers_format_check
    CHECK (format IN ('online','in_person','home','hybrid')),
  CONSTRAINT teacher_offers_price_positive
    CHECK (price_cents >= 2000),          -- align with minimum lesson price ($20)
  CONSTRAINT teacher_offers_duration_positive
    CHECK (duration_minutes >= 15),
  CONSTRAINT teacher_offers_package_session_count
    CHECK (NOT is_package OR (session_count IS NOT NULL AND session_count >= 2))
);

CREATE UNIQUE INDEX idx_teacher_offers_teacher_slug
  ON public.teacher_offers (teacher_id, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX idx_teacher_offers_teacher_status
  ON public.teacher_offers (teacher_id, status);

CREATE INDEX idx_teacher_offers_catalog
  ON public.teacher_offers (status, discipline_id, offer_type, format)
  WHERE status = 'published';
```

### TypeScript mirror (future PR)

```typescript
export type TeacherOfferType =
  | "private_lesson" | "intro_session" | "package" | "assessment"
  | "workshop" | "group_class" | "cohort" | "self_paced_bridge";

export type TeacherOfferStatus = "draft" | "published" | "paused" | "archived";
export type TeacherOfferFormat = "online" | "in_person" | "home" | "hybrid";
```

---

## 27. Migration and legacy fallback

### Seed default offers from existing teacher columns

| Source | Generated offer |
|--------|-----------------|
| `price_per_lesson` + `default_lesson_duration_minutes` + primary discipline | `private_lesson` published |
| `intro_session_enabled` + intro fields | `intro_session` published |
| `home_lesson_enabled` + `home_lesson_price` | optional `private_lesson` format=`home` |

### Strategy: **lazy + batch**

1. **Batch backfill script (PR 9):** One-time migration for all search-visible teachers.
2. **Lazy creation:** On first visit to **Mes formules**, if zero offers → generate drafts from legacy fields for teacher confirmation before publish.
3. **Do not delete** `teachers.price_per_lesson` until:
   - ≥95% of search-visible teachers have ≥1 published offer, AND
   - Checkout fully uses offer snapshots for ≥30 days.

### Search visibility transition

- Phase 5–9: Accept **either** valid `price_per_lesson` **OR** ≥1 published offer with valid price.
- Eventually: require ≥1 published `private_lesson` or `intro_session` offer.

---

## 28. Security / RLS / privacy considerations

### RLS policies (proposed)

| Role | Policy |
|------|--------|
| **Teacher (owner)** | CRUD own rows (`teacher_id` matches auth-linked teacher) |
| **Public / anon** | SELECT only `status = published` AND teacher is public/search-visible |
| **Student** | No direct write; booking insert via existing booking policies |
| **Admin** | Service role read all; mutation deferred |

### Privacy

- Never expose `created_by` email or Stripe account on public offer reads.
- Home format: city/region only on cards; address after confirmed booking (unchanged).
- **Client must not set checkout price** — server validates offer + writes snapshot at booking insert.

### Validation rules (server)

- Published offer requires: title, discipline_id, price ≥ minimum, duration valid, format allowed by teacher capabilities.
- Intro session: enforce once-per-learner at booking layer (existing pattern).
- Package: `session_count ≥ 2`, total price ≥ minimum × session_count or explicit package minimum (TBD).

---

## 29. Rollout phases

| Phase | Scope |
|-------|-------|
| **0** | Architecture docs (this PR) |
| **1** | Schema + RLS + tests |
| **2** | Teacher CRUD API |
| **3** | Mes formules dashboard |
| **4** | Profile offer menu (read-only) |
| **5** | Booking modal offer selection |
| **6** | Stripe checkout + snapshots |
| **7** | Admin Teacher 360 diagnostics |
| **8** | Migration / backfill |
| **9** | Global catalog (gated) |
| **10** | Group classes / workshops |
| **11** | YoPratiqo recommendations |

See `pratiqo-offers-implementation-plan.md` for PR-level detail.

---

## 30. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Supply confusion (teachers don’t create offers) | Lazy backfill + sensible defaults; keep legacy fallback |
| Checkout regression | Feature flag; parallel validation in checkout; extensive tests |
| Price drift / double source of truth | Snapshots on booking; deprecate teacher price only after metrics |
| Empty global catalog | Multi-dimensional launch thresholds |
| Package fulfillment ambiguity | MVP: single charge + manual teacher tracking; ledger sessions later |
| Group class duplication with `group_sessions` | Phase 11 consolidation plan; keep flag off until unified |
| Free tier too restrictive | Start at 3 offers; monitor conversion to Pro |

---

## 31. Non-goals for MVP

- Global offer catalog / map feed
- Group classes, cohorts, waitlists, min enrollment
- Recurring sections (`teacher_offer_sections`)
- YoPratiqo offer recommendations
- Paid offer boosts / featured slots
- Admin offer moderation / approval workflow
- Offer SEO index pages
- Multi-currency beyond teacher’s existing `currency`
- Partial package refunds / session wallets
- Stripe product/price object per offer (continue dynamic `price_data`)

---

## 32. Open decisions

Founder must decide before coding Phase 2+:

1. **Public naming:** “Offres de cours” vs “Formules” on student surfaces? (Recommend: **Offres de cours** student-side, **Mes formules** teacher-side.)
2. **Free teacher limit:** 1 vs 3 published offers? (Recommend: **3**.)
3. **Prof fondateur limit:** 5 vs 10 vs unlimited during promo? (Recommend: **10** or unlimited until founder promo ends.)
4. **Packages in MVP:** Allowed with single checkout? (Recommend: **yes**, total package price.)
5. **Group classes:** MVP or Phase 11? (Recommend: **Phase 11**.)
6. **Mandatory offer selection:** Must every booking reference an offer? (Recommend: **yes for new bookings** after Phase 6, with legacy fallback until backfill complete.)
7. **Default hourly without offers:** Keep legacy path? (Recommend: **yes until backfill threshold**.)
8. **Admin approval:** Required before publish? (Recommend: **no** for MVP; post-publish moderation only if abuse.)
9. **Photos in MVP:** Optional single image? (Recommend: **yes, optional**.)
10. **SEO-indexable offer pages:** Later per-offer URLs? (Recommend: **Phase 10+**, opt-in.)
11. **Package billing:** Single charge vs per-session? (Recommend: **single charge MVP**.)
12. **Intro offer:** Migrate from `intro_session_*` columns or keep both during transition? (Recommend: **migrate to offer**, keep columns synced during transition.)

---

## Appendix A — Code references (audit)

| File | Relevance |
|------|-----------|
| `types.ts` | `Teacher` interface — pricing, intro, home fields |
| `lib/teacherMapper.ts` | Maps DB teacher → UI; discipline display |
| `lib/teacherDisciplines.ts` | Discipline rows for search/profile |
| `lib/taxonomy/disciplines.ts` | Flat discipline catalog |
| `components/BookingModal.tsx` | Booking insert, lesson_type, client price |
| `lib/pricing/bookingCharge.ts` | Server-side charge derivation |
| `app/api/stripe/checkout/route.ts` | Checkout validation + commission |
| `lib/payments/commission.ts` | Platform fee tiers + founder promo |
| `lib/payments/ledger.ts` | `booking_payments` upsert |
| `lib/payments/receipts.ts` | Receipt email content |
| `lib/payments/refunds.ts` | Cancellation refunds |
| `components/TeacherProfile.tsx` | Hourly + intro display |
| `app/(app)/student/search/page.tsx` | Teacher-first discovery |
| `lib/admin/teacher360.ts` | Admin teacher diagnostics |
| `supabase/migrations/007_group_sessions.sql` | Legacy group model |
| `supabase/migrations/047_introductory_sessions_phase1.sql` | Intro session columns |
| `supabase/migrations/038_payment_ledger.sql` | Payment ledger |

---

## Appendix B — Inventory threshold (global catalog gate)

Do **not** launch `/student/offers` on a single global count alone. Recommended **all** conditions:

| Dimension | Minimum |
|-----------|---------|
| Total published offers | ≥ 150 |
| Published offers in ≥ 8 discipline facets | ≥ 8 disciplines with ≥ 10 offers each |
| Regions (QC + ON + BC or top 3 markets) | ≥ 30 offers each |
| Online-format offers | ≥ 40 |
| Teachers with ≥ 2 published offers | ≥ 40 teachers |
| Empty-filter smoke test | Default catalog query returns ≥ 24 results in primary market |

If any dimension fails, keep catalog in **soft launch** (internal/staff-only) or **teacher-profile-only** mode.
