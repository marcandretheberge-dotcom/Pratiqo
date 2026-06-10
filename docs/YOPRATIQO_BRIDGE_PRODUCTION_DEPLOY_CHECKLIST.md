# YoPratiqo Teacher Bridge — Production Deploy Checklist

> **Audience**: release engineer + on-call deploying the YoPratiqo →
> teacher bridge to production Supabase + Vercel.
>
> **Scope**: a single deploy of the bridge slice. Covers Supabase
> migrations `077` + `078`, Vercel deploy verification, manual QA on
> the production URL, mobile checks, privacy spot-checks, and rollback.
>
> **Out of scope**: payments, Stripe, tax, legal pages, Membre Pro
> commission logic, MP3 generation, OpenAI scripts, SEO / sitemap,
> Course schema, paid YoPratiqo checkout. All of these are explicitly
> frozen for this release.

---

## 0. Pre-flight

Run before touching production.

- [ ] CI is green on `origin/main`: latest commit shows ✓ for the
      full suite (`npm run validate:launch`, `npm run test:security`,
      `npm run build`).
- [ ] Local clone of `origin/main` is at the same commit as the green
      Vercel preview that will be promoted.
- [ ] Confirm `lib/yo/yopratiqoProductConfig.ts` still has
      `premiumModulesEnabled: false` and
      `supportedProductTypes: ["free_intro"]`.
- [ ] Confirm there are no pending Stripe / payments / tax / legal
      changes in the deploy window. The bridge deploy is independent.
- [ ] Snapshot of current Supabase prod schema captured (use
      `pg_dump --schema-only` or Supabase Studio "Database backup").

---

## 1. Required Supabase migrations

Two migrations gate the bridge surface.

| # | File | Table created | Owner-only RLS | Anon revoked |
|---|---|---|---|---|
| 077 | `supabase/migrations/077_booking_yopratiqo_learning_summaries.sql` | `public.booking_yopratiqo_learning_summaries` | student write / participant read | yes |
| 078 | `supabase/migrations/078_yopratiqo_progress_snapshots.sql` | `public.yopratiqo_progress_snapshots` | owner-only on every operation | yes |

### 1.1 — Apply migrations

```bash
# From the repo root, against the production Supabase project.
supabase db push --linked
```

If you are using the migration CLI manually:

```bash
psql "$SUPABASE_PROD_URL" -f supabase/migrations/077_booking_yopratiqo_learning_summaries.sql
psql "$SUPABASE_PROD_URL" -f supabase/migrations/078_yopratiqo_progress_snapshots.sql
```

Both files are idempotent (`CREATE TABLE IF NOT EXISTS` +
`DROP POLICY IF EXISTS` + `CREATE POLICY`). Re-running them is safe.

### 1.2 — Confirm tables exist

```sql
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'booking_yopratiqo_learning_summaries',
    'yopratiqo_progress_snapshots'
  )
order by table_name;
```

Expected: 2 rows.

### 1.3 — Confirm RLS is enabled

```sql
select
  relname,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as force_rls
from pg_class
where relname in (
  'booking_yopratiqo_learning_summaries',
  'yopratiqo_progress_snapshots'
);
```

Expected: `rls_enabled = true` for both rows.

### 1.4 — Confirm the policies are installed (exact names)

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'booking_yopratiqo_learning_summaries',
    'yopratiqo_progress_snapshots'
  )
order by tablename, policyname;
```

Expected (8 rows):

| tablename | policyname | cmd |
|---|---|---|
| `booking_yopratiqo_learning_summaries` | `byls_delete_student_own` | `DELETE` |
| `booking_yopratiqo_learning_summaries` | `byls_insert_student_own` | `INSERT` |
| `booking_yopratiqo_learning_summaries` | `byls_select_participants` | `SELECT` |
| `booking_yopratiqo_learning_summaries` | `byls_update_student_own` | `UPDATE` |
| `yopratiqo_progress_snapshots` | `ypps_delete_owner` | `DELETE` |
| `yopratiqo_progress_snapshots` | `ypps_insert_owner` | `INSERT` |
| `yopratiqo_progress_snapshots` | `ypps_select_owner` | `SELECT` |
| `yopratiqo_progress_snapshots` | `ypps_update_owner` | `UPDATE` |

### 1.5 — Confirm anon access is revoked

```sql
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'booking_yopratiqo_learning_summaries',
    'yopratiqo_progress_snapshots'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
```

Expected:
- **No `anon` rows** for either table.
- `authenticated` and `service_role` each have SELECT, INSERT, UPDATE,
  DELETE for both tables.

End-to-end smoke from a clean shell (no auth header — must fail):

```bash
curl -i "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/yopratiqo_progress_snapshots?select=id" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Expected response: HTTP `401` or `403`, never `200` with rows.

### 1.6 — Confirm CHECK constraints + indexes

```sql
-- progress_state CHECK
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.yopratiqo_progress_snapshots'::regclass
  and contype = 'c';

-- (user_id, course_id, module_id) UNIQUE
select conname
from pg_constraint
where conrelid = 'public.yopratiqo_progress_snapshots'::regclass
  and contype = 'u';

-- supporting indexes
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'booking_yopratiqo_learning_summaries',
    'yopratiqo_progress_snapshots'
  )
order by indexname;
```

Expected indexes (minimum):
- `booking_yopratiqo_learning_summaries_booking_idx`
- `booking_yopratiqo_learning_summaries_student_idx`
- `booking_yopratiqo_learning_summaries_teacher_idx`
- `yopratiqo_progress_snapshots_user_idx`
- `yopratiqo_progress_snapshots_user_course_idx`
- `yopratiqo_progress_snapshots_user_activity_idx`

---

## 2. Vercel deploy verification

### 2.1 — Promote the build

- [ ] Confirm the preview deployment matches the green main commit.
- [ ] Promote to production via the Vercel dashboard (or `vercel
      promote <preview-url> --prod`).
- [ ] Confirm the new production deployment URL responds `200` on the
      root path within 60 seconds.

### 2.2 — Environment variables present in production

These must exist in the production Vercel project (do NOT paste real
values into this checklist):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to the
      browser)
- [ ] Any existing payment / mail keys remain unchanged.

### 2.3 — Live route smoke

| URL | Expected |
|---|---|
| `https://<prod>/` | 200 |
| `https://<prod>/yo` | 200 |
| `https://<prod>/yo/langues/espagnol/pays/republique-dominicaine/module-2` | 200 |
| `https://<prod>/yo/langues/espagnol/pays/republique-dominicaine/module-5` | 200 |
| `https://<prod>/student/progress` (auth required) | 200 / 302 to sign-in |
| `https://<prod>/teacher/progress` (auth required) | 200 / 302 to sign-in |

### 2.4 — API route smoke

Unauthenticated calls must reject:

```bash
curl -i "https://<prod>/api/yo/progress"
# Expected: 401 Unauthorized

curl -i -X POST "https://<prod>/api/yo/progress"
# Expected: 401 Unauthorized

curl -i -X POST "https://<prod>/api/bookings/00000000-0000-0000-0000-000000000000/yopratiqo-bridge"
# Expected: 401 or 403, never 200
```

- [ ] All three return a 4xx, not a 5xx and not a `200`.

---

## 3. Manual QA — Student progress flow

Performed by a QA engineer signed in as a student on the production
URL.

- [ ] Open
      `https://<prod>/yo/langues/espagnol/pays/republique-dominicaine/module-2`.
- [ ] Click the "I finished this module" button at the bottom of the
      page.
- [ ] DevTools → Network shows `POST /api/yo/progress` with
      `Authorization: Bearer …` and the response is `200`.
- [ ] Repeat for Modules 3, 4, and 5.
- [ ] Open `https://<prod>/student/progress` and confirm:
      - the legacy "Companion — compact" section (forest / phoenix /
        dragon / star) is rendered and **unchanged**;
      - the new **YoPratiqo Companion** card is rendered just below
        it;
      - the YoPratiqo card shows the correct visual state for the
        student's progress (use the
        [E2E QA runbook](./YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md) state
        table for the full mapping).

---

## 4. Manual QA — Booking consent flow

- [ ] Open the booking modal as the same student against a real
      production teacher.
- [ ] Confirm the YoPratiqo consent checkbox is **unchecked by
      default** (it must be `useState(false)`).
- [ ] Check the consent box; the recap must explicitly mention "no
      raw quiz answers", "no private notes", "no payment data".
- [ ] Confirm the booking. DevTools → Network shows
      `POST /api/bookings/<bookingId>/yopratiqo-bridge` returning
      `200` with `{ consent_granted: true }` in the body.
- [ ] Repeat the booking flow with the checkbox **unchecked**.
      Booking still succeeds; the bridge row is created with
      `consent_granted = false`, `consent_granted_at = null`,
      `summary = null`.

---

## 5. Manual QA — Teacher insight flow

- [ ] Sign out of the student account and sign in as the teacher who
      owns the consenting booking.
- [ ] Open `https://<prod>/teacher/progress`.
- [ ] Expand the consenting student. The `TeacherLearningInsightCard`
      renders in its **unlocked** footer state and the compact
      `CompanionBridgeCard` appears.
- [ ] Expand the non-consenting student. The card stays **locked** —
      no summary fields, no companion footer.
- [ ] DevTools → Network: confirm the page makes a request to
      `booking_yopratiqo_learning_summaries` and **NEVER** to
      `yopratiqo_progress_snapshots`.

---

## 6. Mobile QA (≤ 414 px viewport)

Use Chrome DevTools device mode on the production URL.

- [ ] `/student/progress` stacks vertically without horizontal scroll.
- [ ] YoPratiqo Companion PNG renders crisply (500×500 source) at the
      avatar size.
- [ ] Booking modal: the consent checkbox is full-width, tappable
      (≥ 44 px target), and the recap copy wraps cleanly.
- [ ] `/teacher/progress`: the locked / unlocked variants both render
      without overflow, tag chips wrap rather than overflow.
- [ ] No broken companion images (no 404s in DevTools → Network for
      `/companion/travel/*.png`).

---

## 7. Privacy checks

Each check is blocking; failing any single one means **stop the
deploy** and investigate before signing off.

- [ ] No raw quiz answers anywhere in the teacher UI or in the
      bridge API response (`rawQuiz`, `quiz_answers`,
      `selectedOption`, `pickedOption`, `correctOptionId`,
      `answerLog`, `incorrectAnswers`, `keystrokeHistory`,
      `audio_attempts` — none present).
- [ ] No selected options, no correct answers, no attempt logs.
- [ ] Teacher never queries `yopratiqo_progress_snapshots` directly
      (verified by `tests/yo/yopratiqoTeacherBridgeE2eSmoke.test.ts`
      assertion #12 + manual DevTools check above).
- [ ] Anon RLS spot-check from Section 1.5 returned 401/403, never
      200.
- [ ] Cross-tenant check: signed in as a different teacher (not the
      booking participant), the teacher progress query for the
      consenting student returns zero summary rows.

---

## 8. Rollback notes

The bridge slice is additive and reversible. The application code
falls back to the empty state when either table is missing or
returns no rows.

### 8.1 — Application rollback

```bash
# In Vercel, revert to the previous production deployment.
vercel rollback <previous-prod-deployment-url>
```

The previous build does not call the new tables — it will simply
render the dashboard / booking modal as before the bridge slice. No
data migration is required to roll back the application.

### 8.2 — Migration rollback (only if a schema regression is found)

The bridge slice is **safe to leave in place** even if the
application is rolled back: the tables are not referenced by older
code paths. Only drop them if a real regression in Supabase is
traced to these tables.

If a full drop is required (last resort — coordinate with on-call):

```sql
-- Order matters: drop the bridge table first (it has FK indirection
-- to bookings; the snapshots table is independent).
drop table if exists public.booking_yopratiqo_learning_summaries cascade;
drop table if exists public.yopratiqo_progress_snapshots cascade;

-- Triggers / functions are dropped by CASCADE above. Re-confirm:
select tgname from pg_trigger
where tgname in ('trg_byls_set_updated_at', 'trg_ypps_set_updated_at');
-- expected: 0 rows
```

### 8.3 — Data-loss notice for migration rollback

A full drop **permanently deletes** any progress snapshots and
consent records the production users have already created. Do NOT
drop the tables unless on-call has explicitly authorized it and a
Supabase backup has been confirmed within the last 24 hours.

---

## 9. Post-deploy verification window

- [ ] Watch Vercel logs for 30 minutes after promotion. No 5xx spikes
      on `/api/yo/progress` or `/api/bookings/[id]/yopratiqo-bridge`.
- [ ] Supabase dashboard → Database → Logs: no RLS-denied errors on
      either table for a logged-in user.
- [ ] Spot-check a real production user's `/student/progress` page —
      the YoPratiqo Companion card renders without console errors.

---

## 10. Sign-off

| Reviewer | Date | Pass / Fail | Notes |
|---|---|---|---|
| Release engineer | | | |
| QA | | | |
| Product | | | |
| On-call engineering | | | |

The deploy is **blocked** if any item in Sections 1, 2, 4, 5, or 7
fails. Section 3 (student flow) and Section 6 (mobile) items are
blocking when the affected surface is unusable.

Linked references:
- [E2E QA runbook](./YOPRATIQO_TEACHER_BRIDGE_E2E_QA.md)
- [Teacher bridge architecture](./YOPRATIQO_TEACHER_BRIDGE_ARCHITECTURE.md)
- [Companion bridge asset plan](./COMPANION_BRIDGE_ASSET_PLAN.md)
