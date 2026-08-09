# Teacher Search Visibility Audit

Date: 2026-08-08

Scope: audit/report/tests only. This document describes the current teacher marketplace search contract. It does not change search eligibility, publish behavior, RLS, Stripe, booking, commissions, Membre Pro, YoPratiqo, legal copy, or country policy.

## 1. Executive summary

The public teacher list is powered by `public.teachers_public`, a security-invoker view that selects from the `public.list_public_teachers()` security-definer function. Public student search does not read `public.teachers` directly.

The exact marketplace visibility source of truth is currently:

- `teachers.is_public` for publish/hide state.
- `public.list_public_teachers()` for the actual public search read surface.
- `lib/teachers/searchVisibilityDiagnostics.ts` for admin/read-only diagnostic labels.
- `lib/teachers/profilePublishEligibility.ts` for teacher self-publish readiness.

Important finding: the SQL function and TypeScript diagnostics are not perfectly aligned. The SQL function only filters core marketplace safety/visibility fields. The diagnostic helper adds product/readiness blockers such as missing rate, missing subject, missing country, unsupported country, missing bio, and missing location for in-person-only teachers. These explain why a teacher may fail self-publish/readiness, but they are not all direct SQL filters in `teachers_public`.

Important market finding: Canada is the only launched teacher market in `lib/config/markets.ts`. The self-publish/API market rule blocks unsupported or missing teacher countries before a teacher can publish. However, `list_public_teachers()` itself does not filter `country_code`, so an already-public unsupported-country row could still be returned by `teachers_public` unless blocked elsewhere.

Important online-teacher finding: the diagnostic helper allows online-capable teachers to lack a public location. The self-publish checklist still requires city + region for every teacher, including online-capable teachers. That is a current mismatch and likely a candidate for the next product PR.

## 2. Exact public search source

Primary student search:

- Route/page: `app/(app)/student/search/page.tsx`
- Query: browser-side Supabase query against `TEACHERS_PUBLIC_TABLE`.
- Table constant: `TEACHERS_PUBLIC_TABLE = "teachers_public"` in `lib/supabase/queries.ts`.
- Select list: `TEACHERS_LIST_SELECT` in `lib/supabase/queries.ts`.
- Mapping: `teacherRowToTeacher()` in `lib/teacherMapper.ts`.
- Additional card metadata: `/api/teachers/plans?ids=...` in `app/api/teachers/plans/route.ts`, which also reads `teachers_public`.

Public marketing route:

- `/trouver-un-prof` is a marketing/search-intent page.
- `components/marketing/FindTeacherSearch.tsx` submits to `/student/search` with `q`, `place`, and `format` params.
- It does not load the teacher index itself.

Other pre-booking/public teacher surfaces also read `teachers_public`:

- `app/LandingPageClient.tsx`
- `components/Explore.tsx`
- `components/marketing/TeacherQuiz.tsx`
- `components/blog/RelatedTeachersWidget.tsx`
- `app/teacher/profile/[id]/page.tsx`
- `app/teacher/profile/[id]/TeacherProfileClient.tsx`

## 3. Exact admin source

Admin users list:

- API: `app/api/admin/users/route.ts`
- Admin UI: `app/(app)/admin/users/page.tsx`
- Base admin profile query: `profiles`
- Teacher diagnostic query: service-role read from `teachers`
- Public membership query: service-role read from `teachers_public`
- Subject count query: `teacher_disciplines`
- Diagnostic helper: `diagnoseTeacherSearchVisibility()`

Admin output distinguishes:

- `teacher_onboarding_complete`
- `teacher_is_public`
- `teacher_search_visible`
- `teacher_search_visibility_blockers`
- `teacher_search_visibility_warnings`

The admin API does not return private addresses or private coordinates in the user list payload.

## 4. Exact SQL/view/RPC filters

Current final public read surface is defined in:

- `supabase/migrations/081_admin_teacher_badges.sql`

It recreates:

- `public.list_public_teachers()` as `SECURITY DEFINER`
- `public.teachers_public` as `WITH (security_invoker = true) SELECT * FROM public.list_public_teachers()`

Exact SQL filters in `list_public_teachers()`:

```sql
FROM public.teachers t
INNER JOIN public.profiles p ON p.id = t.user_id
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND COALESCE(t.identity_status, 'none') <> 'failed'
  AND COALESCE(t.is_demo, false) = false
  AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND t.user_id IS NOT NULL
  AND COALESCE(p.is_active, true) = true
  AND p.deactivated_at IS NULL
  AND p.deleted_at IS NULL
  AND p.anonymized_at IS NULL;
```

SQL does not currently filter on:

- `country_code`
- `price_per_lesson`
- `discipline`
- `category`
- `teacher_disciplines`
- `teaching_mode`
- `bio`
- `profile_photo_url` / `image_url`
- `availability`
- `intro_session_enabled`
- `intro_session_price_cents`
- city/region/public location
- `identity_verified = true`

## 5. Exact TypeScript diagnostic blockers

Diagnostic source:

- `lib/teachers/searchVisibilityDiagnostics.ts`

Blocker codes:

- `BLOCKER_PROFILE_NOT_PUBLISHED`
- `BLOCKER_TEACHER_ROW_MISSING`
- `BLOCKER_PROFILE_INACTIVE`
- `BLOCKER_TEACHER_INACTIVE`
- `BLOCKER_DEMO_PROFILE`
- `BLOCKER_INVALID_PUBLIC_IDS`
- `BLOCKER_MISSING_PUBLIC_DATA`
- `BLOCKER_MISSING_BASE_RATE`
- `BLOCKER_MISSING_SUBJECT`
- `BLOCKER_MISSING_TEACHING_FORMAT`
- `BLOCKER_MISSING_PUBLIC_LOCATION_OR_ONLINE`
- `BLOCKER_UNSUPPORTED_COUNTRY`
- `BLOCKER_FAILED_IDENTITY_IF_SEARCH_BLOCKING`
- `BLOCKER_BY_RLS_OR_PUBLIC_VIEW`

The helper treats `inTeachersPublicView === true` as authoritative visible-in-search and returns no blockers, only warnings. When a teacher is not in the public view, the helper labels likely causes using base `teachers`, profile state, market config, and discipline count.

Self-publish readiness source:

- `lib/teachers/profilePublishEligibility.ts`
- `lib/teachers/teacherSetupProgress.ts`

Self-publish blockers:

- admin/profile blocked
- setup incomplete
- unsupported market
- failed identity

Setup completeness currently requires:

- name
- bio length at least 20
- at least one discipline
- base price > 0
- at least one availability item
- city + region

## 6. Comparison: SQL vs TypeScript diagnostics

They are not perfectly aligned.

| Condition | Direct `teachers_public` SQL filter? | Diagnostic/readiness behavior |
|---|---:|---|
| `teachers.is_public` false | Yes | Blocker: `BLOCKER_PROFILE_NOT_PUBLISHED` |
| `teachers.is_public` null | SQL treats as public via `COALESCE(..., true)` | Diagnostics/self-publish treat only `true` as published |
| Teacher/profile deleted or deactivated | Yes | Blocker: inactive/teacher inactive |
| Demo teacher | Yes | Blocker: demo profile |
| Invalid id/user_id | Yes | Blocker: invalid public ids |
| Failed identity status | Yes | Blocker: failed identity |
| Identity not verified | No | Warning only |
| Unsupported country | No | Blocker when not in view; publish API blocks |
| Missing country | No | `BLOCKER_MISSING_PUBLIC_DATA`; publish market support fails |
| Missing base rate | No | Blocker when not in view; self-publish setup incomplete |
| Missing subject/category | No | Blocker when not in view; self-publish setup incomplete |
| Missing teaching format | No | Blocker when not in view |
| Missing bio | No | Blocker via missing public data / profile setup |
| Missing availability | No | Warning in diagnostics; self-publish setup incomplete |
| Missing intro lesson | No | Warning only |
| Missing photo | No | No current blocker |
| Missing location for online-capable teacher | No | No diagnostic blocker |
| Missing city/region for self-publish | No | Self-publish setup incomplete for every teacher |

## 7. Exact field behind "profile not published"

The field is `public.teachers.is_public`.

Current behavior differs by layer:

- SQL public view: `COALESCE(t.is_public, true) = true`, so `false` blocks and `NULL` passes.
- Diagnostic helper: `teacher.is_public !== true` is `BLOCKER_PROFILE_NOT_PUBLISHED`.
- Teacher self-serve publish API: `PATCH /api/teacher/profile/visibility` updates `teachers.is_public`.
- Admin SEO publish route: `POST /api/admin/users/:id/teacher-seo-publish` can also update `teachers.is_public`.

Recommendation for a later PR: normalize the contract so `NULL` is not treated differently by SQL and TypeScript. Do not change this in the audit PR.

## 8. Exact behavior of each publish/visibility button

Teacher profile visibility card:

- Component: `components/teacher/TeacherProfileVisibilityCard.tsx`
- Mounted in:
  - `components/Dashboard.tsx`
  - `app/(app)/teacher/verification/page.tsx`
- API: `PATCH /api/teacher/profile/visibility`
- Publish action updates `teachers.is_public = true`
- Unpublish action updates `teachers.is_public = false`

Teacher settings visibility toggle:

- Component: `components/teacher/TeacherAccountView.tsx`
- API: `PATCH /api/teacher/profile/visibility`
- Uses the same `teachers.is_public` field as the profile visibility card.

Admin SEO publication card:

- Component: `components/admin/TeacherSeoPublicationCard.tsx`
- API: `POST /api/admin/users/:id/teacher-seo-publish`
- `publish` updates:
  - `is_public = true`
  - `public_profile_enabled = true`
  - `search_indexing_consent = true`
  - `public_profile_last_indexable_at = now`
- `unpublish` clears only `public_profile_last_indexable_at`; it does not hide marketplace.
- `hide_marketplace` updates `is_public = false`.
- `request_corrections` updates:
  - `is_public = false`
  - `public_profile_enabled = false`
  - `search_indexing_consent = false`
  - `public_profile_last_indexable_at = null`

Teacher SEO self-request route:

- API: `PATCH /api/teacher/profile/seo-publication`
- It does not set `is_public`.
- It controls SEO intent fields only, and market support is checked separately.

Onboarding completion:

- Minimal teacher onboarding creates/ensures a private draft teacher row.
- `lib/teachers/ensureTeacherProfileRow.ts` sets `is_public: false`.
- `app/api/teacher/onboarding/complete/route.ts` marks `profiles.teacher_onboarding_complete = true`, but does not automatically publish the teacher.

## 9. Current country/market rule

Field checked:

- `teachers.country_code`, with profile country as fallback in some API contexts.

Supported countries:

- Canada (`CA`) only for launched teacher onboarding, student booking, Membre Pro, and payouts.
- Uruguay (`UY`) exists as an inactive/waitlist placeholder.
- Unknown countries are unsupported.

Where defined:

- `lib/config/markets.ts`
- `isTeacherMarketSupported(countryCode)` delegates to `isMarketGateEnabled(countryCode, "teacher_onboarding")`.

Where applied:

- Teacher onboarding completion API blocks unsupported submitted country codes.
- Teacher pricing API blocks unsupported teacher countries.
- Teacher location verification API blocks unsupported countries.
- Teacher profile visibility publish API blocks unsupported or missing teacher countries.
- Teacher SEO request/admin publication checks support separately.
- `list_public_teachers()` does not apply country filtering.

Does it affect outside-Canada teachers?

- Yes for self-publish, Membre Pro, payouts, pricing, and location verification.
- Not directly in `teachers_public` SQL.
- Therefore, outside-Canada teachers are blocked from becoming public through the normal self-serve publish path today, but an already-public outside-Canada row can still be returned by the SQL view if it passes the SQL filters.

Does it affect online-only teachers?

- Yes for self-publish and monetized teacher flows. The market check does not distinguish online-only from in-person.
- No direct SQL country filter exists for online-only or in-person teachers.

Tax/compliance note:

This audit does not decide whether Pratiqo can legally/tax-wise onboard teachers in other countries. The code should make the product rule clear and configurable, but final market expansion requires accounting/legal confirmation.

## 10. Current online-only teacher rule

Public search SQL:

- Does not require city, region, or public coordinates.
- Does not inspect `teaching_mode` for visibility.

Diagnostic helper:

- `online`, `both`, and `all` are considered online-capable.
- Online-capable teachers do not get `BLOCKER_MISSING_PUBLIC_LOCATION_OR_ONLINE`.

Self-publish readiness:

- The setup checklist still requires city + region for every teacher.
- The publish eligibility builder does not pass `teachingMode` into `buildTeacherSetupChecklist()`, so online-only teachers are not exempt from the zone checklist today.

SEO profile readiness:

- `teacherHasPublicLocationOrTeachingFormat()` allows city/region or online-capable format.

## 11. Current in-person teacher rule

Public search SQL:

- Does not require public location or city/region.

Diagnostic helper:

- In-person-only formats that are not online-capable get `BLOCKER_MISSING_PUBLIC_LOCATION_OR_ONLINE` if no city+region and no safe public coordinates exist.

Self-publish readiness:

- Requires city + region for every teacher.

## 12. Blockers table

| Condition | Field/source | Blocks public SQL today? | TS/admin blocker? | Warning only? | Where enforced | User-facing label | Recommended action |
|---|---|---:|---:|---:|---|---|---|
| Profile not public | `teachers.is_public` | Yes when `false`; no when `NULL` | Yes | No | SQL, diagnostics, publish API | Profil public desactive | Normalize NULL semantics later; publish profile |
| Teacher row missing | `teachers` row by `profiles.id`/`user_id` | Yes | Yes | No | SQL join/admin diagnostics | Profil professeur absent | Repair/ensure teacher row |
| Profile inactive/deleted/anonymized | `profiles.is_active`, `deactivated_at`, `deleted_at`, `anonymized_at` | Yes | Yes | No | SQL, diagnostics | Profil inactif | Admin/account repair |
| Teacher inactive/deleted | `teachers.deactivated_at`, `deleted_at` | Yes | Yes | No | SQL, diagnostics | Profil masque/admin | Admin review |
| Demo profile | `teachers.is_demo` | Yes | Yes | No | SQL, diagnostics | Profil demo | Keep blocked |
| Invalid public ids | `teachers.id`, `teachers.user_id` UUID shape | Yes | Yes | No | SQL, diagnostics, client launch filter | Identifiants invalides | Data repair |
| Failed identity | `teachers.identity_status = failed` or failed reason | Yes for `identity_status`; TS also failed reason | Yes | No | SQL, identity gate, diagnostics | Verification d'identite echouee | Keep blocked |
| Unsupported country | `teachers.country_code` + market config | No direct SQL block | Yes when not in public view; publish API blocks | No | TS/API only | Pays non supporte | Product policy decision |
| Missing country | `teachers.country_code` | No | Yes via missing public data / market support | No | TS/API only | Pays manquant | Decide whether online-global policy changes this |
| Missing base rate | `teachers.price_per_lesson` | No | Yes when not in public view; publish setup incomplete | No | TS/API only | Tarif manquant | Keep for paid booking or separate online/free profile policy |
| Missing subject/category | `teacher_disciplines`, `discipline`, `category` | No | Yes when not in public view; publish setup incomplete | No | TS/API only | Matiere manquante | Keep |
| Missing teaching format | `teachers.teaching_mode` | No | Yes when not in public view | No | TS only | Format manquant | Keep |
| Missing bio | `teachers.bio` | No | Yes via public data / profile setup | No | TS/API only | Bio manquante | Keep |
| In-person without public location | `teaching_mode`, `city`, `region`, `location.public` | No | Yes | No | TS only | Zone manquante | Keep for in-person |
| Missing availability | `teachers.availability` | No | Self-publish setup incomplete | Diagnostic warning | TS/API only | Disponibilite manquante | Product decision: warning vs publish blocker |
| No intro lesson | `intro_session_enabled`, `intro_session_price_cents` | No | No | Yes | Diagnostics only | Intro manquante | Keep warning only |
| Missing photo | `profile_photo_url`, `image_url` | No | No | No | Not enforced | Photo manquante | Optional quality warning later |
| Low completion | Composite diagnostic | No | No blocker by itself | Yes | Diagnostics only | Profil incomplet | Keep warning |

## 13. Warnings table

| Warning | Field/source | Blocks search today? | Where enforced | Meaning |
|---|---|---:|---|---|
| `WARNING_IDENTITY_NOT_VERIFIED` | `identity_verified !== true` and not failed | No | Diagnostics | Teacher can appear, but trust badge is incomplete |
| `WARNING_NO_AVAILABILITY` | empty `availability` | No direct SQL block | Diagnostics | Teacher may be hard to book; self-publish setup currently requires availability |
| `WARNING_NO_INTRO_LESSON` | intro disabled or invalid/null price | No | Diagnostics | Intro offer missing; not a search blocker |
| `WARNING_PROFILE_LOW_COMPLETION` | missing public/profile readiness fields | No by itself | Diagnostics | Quality/completeness warning |

## 14. Product recommendations

Option A - Canada teachers only

Only teachers with supported Canadian market/country appear. This matches the current launch-market decision most closely. If selected, move the country rule into a single explicit visibility policy and align SQL, diagnostics, publish API, and admin labels.

Option B - Canadian student market, global online teachers

Teachers outside Canada can appear if:

- `teaching_mode = online` or `both`
- profile is otherwise complete
- country is not sanctioned/blocked if such a list exists
- payouts/Stripe/compliance are still supported or disabled clearly
- tax/legal/accounting review separately confirms the model

This would require a product/legal decision. Do not implement from the current audit alone.

Option C - Configurable market policy

Create a config-based rule such as:

- `allowedTeacherCountries`
- `allowedStudentCountries`
- `allowInternationalOnlineTeachers`
- `blockedCountries`
- per-gate behavior for marketplace visibility, paid booking, payout, Membre Pro, SEO, and in-person/home lessons

This is the safest long-term structure because it avoids scattering country logic across SQL and TypeScript.

Recommended next direction: Option C as the implementation structure, with Option A as the default behavior until legal/accounting approves any broader online-teacher policy.

## 15. Safe next PR proposal

Proposed PR: `fix(teachers): align search visibility policy diagnostics`

Safe scope:

1. Create one central teacher marketplace visibility policy helper that explicitly models:
   - public SQL blockers
   - self-publish blockers
   - warnings
   - market/country policy
   - online-only location exemption
2. Decide whether `teachers.is_public NULL` should be visible or hidden, then align SQL and TS.
3. Decide whether online-only teachers need city+region for self-publish. If not, update `buildTeacherSetupChecklist()` to use `teachingMode`.
4. Keep `teachers_public` as the only public read surface.
5. Do not auto-publish teachers.
6. Do not change country policy until legal/accounting confirms it.

Validation target for the next PR:

- SQL, diagnostic helper, self-publish API, admin labels, and CLI script all classify the same row the same way for the chosen policy.
