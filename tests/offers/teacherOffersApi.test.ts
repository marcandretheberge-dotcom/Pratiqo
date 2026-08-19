/**
 * Teacher offers CRUD API: validation, sanitization, ownership, and route guards.
 * Static + unit tests only (no live Supabase). No UI, Stripe, or booking coverage.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  sanitizeTeacherOfferDescription,
  sanitizeTeacherOfferTitle,
} from "../../lib/offers/sanitizeTeacherOfferInput";
import { sortTeacherOffersForDashboard } from "../../lib/offers/sortTeacherOffers";
import {
  buildTeacherOfferStatusPatch,
  isAllowedTeacherOfferStatusTransition,
} from "../../lib/offers/statusTransitions";
import {
  isTeacherOfferId,
  mapTeacherOfferRow,
  OFFER_NOT_FOUND_BODY,
  TEACHER_NOT_FOUND_BODY,
} from "../../lib/offers/teacherOfferDto";
import {
  TEACHER_OFFERS_SANITY_CAP,
  type TeacherOfferDto,
} from "../../lib/offers/types";
import {
  isCanonicalTeacherOfferDisciplineId,
  parseTeacherOfferCreateInput,
  parseTeacherOfferUpdateInput,
  teacherOfferCreateToInsertRow,
  teacherOfferUpdateToPatchRow,
} from "../../lib/offers/validation";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const LIST_ROUTE = "app/api/teacher/offers/route.ts";
const ITEM_ROUTE = "app/api/teacher/offers/[offerId]/route.ts";
const AUTH = "lib/offers/requireOwnedTeacher.ts";
const VALIDATION = "lib/offers/validation.ts";
const LIST_SRC = read(LIST_ROUTE);
const ITEM_SRC = read(ITEM_ROUTE);
const AUTH_SRC = read(AUTH);
const VALIDATION_SRC = read(VALIDATION);

function dto(partial: Partial<TeacherOfferDto> & Pick<TeacherOfferDto, "id" | "status">): TeacherOfferDto {
  return {
    teacherId: "teacher-1",
    title: "Piano",
    slug: null,
    shortDescription: null,
    description: null,
    disciplineId: "piano",
    specialite: null,
    offerType: "private_lesson",
    format: "online",
    imageUrl: null,
    priceCents: 4000,
    currency: "CAD",
    durationMinutes: 60,
    sessionCount: null,
    capacityMin: null,
    capacityMax: null,
    level: null,
    ageMin: null,
    ageMax: null,
    requiresIdentity: false,
    requiresManualConfirmation: false,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function validCreate(overrides: Record<string, unknown> = {}) {
  return {
    title: "Cours de piano",
    offer_type: "private_lesson",
    format: "online",
    price_cents: 4500,
    ...overrides,
  };
}

test("list and item offer routes exist", () => {
  assert.equal(existsSync(join(ROOT, LIST_ROUTE)), true);
  assert.equal(existsSync(join(ROOT, ITEM_ROUTE)), true);
});

test("unauthenticated requests are rejected with 401", () => {
  assert.match(AUTH_SRC, /status: 401/);
  assert.match(AUTH_SRC, /error: "unauthenticated"/);
  assert.match(LIST_SRC, /requireOwnedTeacher/);
  assert.match(ITEM_SRC, /requireOwnedTeacher/);
});

test("authenticated user with no teacher row returns 403", () => {
  assert.match(AUTH_SRC, /TEACHER_NOT_FOUND_BODY/);
  assert.match(AUTH_SRC, /status: 403/);
  assert.deepEqual(TEACHER_NOT_FOUND_BODY, { error: "teacher_not_found" });
  assert.doesNotMatch(AUTH_SRC, /status: 403[\s\S]*offer_not_found/);
});

test("teacher list query is scoped to the owned teacher_id", () => {
  assert.match(LIST_SRC, /from\("teacher_offers"\)/);
  assert.match(LIST_SRC, /\.eq\("teacher_id", teacherId\)/);
  assert.match(LIST_SRC, /\{ offers:/);
});

test("create uses server-owned teacher_id and created_by", () => {
  assert.match(LIST_SRC, /teacherOfferCreateToInsertRow\(teacherId, userId/);
  const insert = teacherOfferCreateToInsertRow(
    "owned-teacher",
    "user-1",
    parseTeacherOfferCreateInput(validCreate({ teacher_id: "attacker-teacher" })).ok
      ? (parseTeacherOfferCreateInput(validCreate({ teacher_id: "attacker-teacher" })) as {
          ok: true;
          data: Parameters<typeof teacherOfferCreateToInsertRow>[2];
        }).data
      : (() => {
          throw new Error("expected valid create");
        })(),
    "2026-04-01T00:00:00.000Z",
  );
  assert.equal(insert.teacher_id, "owned-teacher");
  assert.equal(insert.created_by, "user-1");
  assert.notEqual(insert.teacher_id, "attacker-teacher");
});

test("client-supplied teacher_id is ignored on create", () => {
  const parsed = parseTeacherOfferCreateInput(validCreate({ teacher_id: "other-teacher" }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const row = teacherOfferCreateToInsertRow("owned", "user-1", parsed.data, "2026-01-01T00:00:00.000Z");
  assert.equal(row.teacher_id, "owned");
});

test("owned offer loader never 403s on ownership mismatch", () => {
  assert.match(AUTH_SRC, /loadOwnedTeacherOffer/);
  assert.match(AUTH_SRC, /\.eq\("id", offerId\)/);
  assert.match(AUTH_SRC, /\.eq\("teacher_id", teacherId\)/);
  assert.match(AUTH_SRC, /never 403 for ownership mismatch/);
  assert.match(ITEM_SRC, /offerNotFoundResponse/);
  assert.doesNotMatch(ITEM_SRC, /status: 403/);
});

test("non-existent and not-owned offers share the same 404 body", () => {
  assert.deepEqual(OFFER_NOT_FOUND_BODY, { error: "offer_not_found" });
  assert.match(ITEM_SRC, /if \(!offer\) return offerNotFoundResponse\(\)/);
  assert.match(ITEM_SRC, /if \(!current\) return offerNotFoundResponse\(\)/);
  assert.equal(isTeacherOfferId("not-a-uuid"), false);
});

test("create/read/update/list/delete response shapes", () => {
  assert.match(LIST_SRC, /return NextResponse\.json\(\{ offers:/);
  assert.match(LIST_SRC, /return NextResponse\.json\(\{ offer \}\)/);
  assert.match(ITEM_SRC, /return NextResponse\.json\(\{ offer \}\)/);
  assert.match(ITEM_SRC, /return NextResponse\.json\(\{ ok: true \}\)/);
});

test("create validates title length", () => {
  const empty = parseTeacherOfferCreateInput(validCreate({ title: "   " }));
  assert.equal(empty.ok, false);
  const long = parseTeacherOfferCreateInput(validCreate({ title: "x".repeat(121) }));
  assert.equal(long.ok, false);
  const ok = parseTeacherOfferCreateInput(validCreate({ title: "Piano débutant" }));
  assert.equal(ok.ok, true);
});

test("create validates offer_type", () => {
  const bad = parseTeacherOfferCreateInput(validCreate({ offer_type: "formule" }));
  assert.equal(bad.ok, false);
  const ok = parseTeacherOfferCreateInput(validCreate({ offer_type: "package" }));
  assert.equal(ok.ok, true);
});

test("create validates format", () => {
  const bad = parseTeacherOfferCreateInput(validCreate({ format: "studio" }));
  assert.equal(bad.ok, false);
  const ok = parseTeacherOfferCreateInput(validCreate({ format: "in_person" }));
  assert.equal(ok.ok, true);
});

test("create validates status", () => {
  const archived = parseTeacherOfferCreateInput(validCreate({ status: "archived" }));
  assert.equal(archived.ok, false);
  const paused = parseTeacherOfferCreateInput(validCreate({ status: "paused" }));
  assert.equal(paused.ok, false);
  const draft = parseTeacherOfferCreateInput(validCreate({ status: "draft" }));
  assert.equal(draft.ok, true);
  if (draft.ok) assert.equal(draft.data.status, "draft");
  const published = parseTeacherOfferCreateInput(validCreate({ status: "published" }));
  assert.equal(published.ok, true);
  if (published.ok) assert.equal(published.data.status, "published");
});

test("create validates price_cents", () => {
  const negative = parseTeacherOfferCreateInput(validCreate({ price_cents: -1 }));
  assert.equal(negative.ok, false);
  const float = parseTeacherOfferCreateInput(validCreate({ price_cents: 10.5 }));
  assert.equal(float.ok, false);
  const zero = parseTeacherOfferCreateInput(validCreate({ price_cents: 0 }));
  assert.equal(zero.ok, true);
});

test("create validates slug format", () => {
  assert.equal(parseTeacherOfferCreateInput(validCreate({ slug: "Piano" })).ok, false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ slug: "piano debutant" })).ok, false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ slug: "piano_debutant" })).ok, false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ slug: "piano-debutant" })).ok, true);
});

test("create validates discipline_id format and taxonomy membership", () => {
  assert.equal(isCanonicalTeacherOfferDisciplineId("piano"), true);
  assert.equal(isCanonicalTeacherOfferDisciplineId("Français"), false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ discipline_id: "Français" })).ok, false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ discipline_id: "not_a_real_subject" })).ok, false);
  assert.equal(parseTeacherOfferCreateInput(validCreate({ discipline_id: "piano" })).ok, true);
});

test("title/short_description/description are stored as safe plain text", () => {
  const parsed = parseTeacherOfferCreateInput(
    validCreate({
      title: "  <b>Piano</b> privé  ",
      short_description: "<p>Cours calme</p>",
      description: "<p>Premier\n\n\nparagraphe</p>",
    }),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.data.title, "Piano privé");
  assert.equal(parsed.data.shortDescription, "Cours calme");
  assert.equal(parsed.data.description, "Premier\n\nparagraphe");
  assert.doesNotMatch(parsed.data.title, /<|>/);
});

test("unsafe HTML/script input is stripped", () => {
  const stripped = sanitizeTeacherOfferTitle(`<script>alert(1)</script>Piano`);
  assert.equal(stripped, "Piano");
  const encoded = sanitizeTeacherOfferDescription(`&lt;script&gt;alert(1)&lt;/script&gt;Hello`);
  assert.equal(encoded, "Hello");
  const handlers = sanitizeTeacherOfferTitle(`<img src=x onerror="alert(1)">Cours`);
  assert.equal(handlers, "Cours");
  const empty = parseTeacherOfferCreateInput(validCreate({ title: "<script>alert(1)</script>" }));
  assert.equal(empty.ok, false);
});

test("update cannot change teacher_id or created_by", () => {
  const parsed = parseTeacherOfferUpdateInput({
    title: "Nouveau titre",
    teacher_id: "other",
    created_by: "other-user",
    created_at: "2000-01-01T00:00:00.000Z",
    updated_at: "2000-01-01T00:00:00.000Z",
    published_at: "2000-01-01T00:00:00.000Z",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const row = teacherOfferUpdateToPatchRow(parsed.data);
  assert.equal("teacher_id" in row, false);
  assert.equal("created_by" in row, false);
  assert.equal("created_at" in row, false);
  assert.equal("updated_at" in row, false);
  assert.equal("published_at" in row, false);
  assert.equal("paused_at" in row, false);
  assert.equal("archived_at" in row, false);
  assert.equal(row.title, "Nouveau titre");
});

test("publishing sets published_at if missing", () => {
  const patch = buildTeacherOfferStatusPatch("draft", "published", "2026-05-01T12:00:00.000Z", {
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
  });
  assert.equal("error" in patch, false);
  if ("error" in patch) return;
  assert.equal(patch.status, "published");
  assert.equal(patch.published_at, "2026-05-01T12:00:00.000Z");
});

test("pausing sets paused_at", () => {
  const patch = buildTeacherOfferStatusPatch("published", "paused", "2026-05-02T12:00:00.000Z", {
    publishedAt: "2026-05-01T12:00:00.000Z",
    pausedAt: null,
    archivedAt: null,
  });
  assert.equal("error" in patch, false);
  if ("error" in patch) return;
  assert.equal(patch.paused_at, "2026-05-02T12:00:00.000Z");
});

test("archiving sets archived_at", () => {
  const patch = buildTeacherOfferStatusPatch("published", "archived", "2026-05-03T12:00:00.000Z", {
    publishedAt: "2026-05-01T12:00:00.000Z",
    pausedAt: null,
    archivedAt: null,
  });
  assert.equal("error" in patch, false);
  if ("error" in patch) return;
  assert.equal(patch.archived_at, "2026-05-03T12:00:00.000Z");
});

test("archived -> published/paused/draft returns invalid_status_transition", () => {
  for (const to of ["published", "paused", "draft"] as const) {
    assert.equal(isAllowedTeacherOfferStatusTransition("archived", to), false);
    const patch = buildTeacherOfferStatusPatch("archived", to, "2026-05-04T00:00:00.000Z", {
      publishedAt: "2026-01-01T00:00:00.000Z",
      pausedAt: null,
      archivedAt: "2026-02-01T00:00:00.000Z",
    });
    assert.deepEqual(patch, { error: "invalid_status_transition" });
  }
  assert.match(ITEM_SRC, /invalid_status_transition/);
  assert.match(ITEM_SRC, /status: 409/);
});

test("paused -> published keeps paused_at as historical value", () => {
  const pausedAt = "2026-03-01T00:00:00.000Z";
  const patch = buildTeacherOfferStatusPatch("paused", "published", "2026-05-05T00:00:00.000Z", {
    publishedAt: "2026-01-01T00:00:00.000Z",
    pausedAt,
    archivedAt: null,
  });
  assert.equal("error" in patch, false);
  if ("error" in patch) return;
  assert.equal(patch.status, "published");
  assert.equal("paused_at" in patch, false);
});

test("DELETE archives instead of hard-deleting published offers", () => {
  assert.match(ITEM_SRC, /status: "archived"/);
  assert.match(ITEM_SRC, /archived_at: nowIso/);
  assert.doesNotMatch(ITEM_SRC, /\.delete\(/);
  assert.match(ITEM_SRC, /export async function DELETE/);
});

test("duplicate slug returns 409 slug_conflict", () => {
  assert.match(LIST_SRC, /error: "slug_conflict"/);
  assert.match(ITEM_SRC, /error: "slug_conflict"/);
  assert.match(LIST_SRC, /isPostgresUniqueViolation/);
  assert.match(ITEM_SRC, /isPostgresUniqueViolation/);
});

test("list ordering is published, paused, draft, archived", () => {
  const ordered = sortTeacherOffersForDashboard([
    dto({
      id: "d1",
      status: "draft",
      updatedAt: "2026-06-02T00:00:00.000Z",
    }),
    dto({
      id: "a1",
      status: "archived",
      archivedAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    }),
    dto({
      id: "p-old",
      status: "published",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
    }),
    dto({
      id: "p-new",
      status: "published",
      publishedAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }),
    dto({
      id: "pause",
      status: "paused",
      updatedAt: "2026-06-03T00:00:00.000Z",
    }),
  ]);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["p-new", "p-old", "pause", "d1", "a1"],
  );
  assert.match(LIST_SRC, /sortTeacherOffersForDashboard/);
});

test("create rejects when teacher already has 50 total offers", () => {
  assert.equal(TEACHER_OFFERS_SANITY_CAP, 50);
  assert.match(LIST_SRC, /TEACHER_OFFERS_SANITY_CAP/);
  assert.match(LIST_SRC, /offer_limit_sanity_cap/);
  assert.match(
    LIST_SRC,
    /Defensive sanity cap only\. Product plan\/founder published-offer limits are implemented in a later PR\./,
  );
  assert.match(LIST_SRC, /Future: enforce published offer limits by plan\/founder status before publishing\./);
});

test("create defaults to draft and can set published_at when published", () => {
  const draft = parseTeacherOfferCreateInput(validCreate());
  assert.equal(draft.ok, true);
  if (!draft.ok) return;
  assert.equal(draft.data.status, "draft");
  const row = teacherOfferCreateToInsertRow(
    "t1",
    "u1",
    { ...draft.data, status: "published" },
    "2026-07-01T00:00:00.000Z",
  );
  assert.equal(row.status, "published");
  assert.equal(row.published_at, "2026-07-01T00:00:00.000Z");
});

test("DTO mapper omits created_by, address, and Stripe fields", () => {
  const mapped = mapTeacherOfferRow({
    id: "11111111-1111-4111-8111-111111111111",
    teacher_id: "teacher-1",
    created_by: "secret-user",
    title: "Piano",
    slug: null,
    short_description: null,
    description: null,
    discipline_id: "piano",
    specialite: null,
    offer_type: "private_lesson",
    format: "online",
    status: "draft",
    image_url: null,
    price_cents: 4000,
    currency: "CAD",
    duration_minutes: 60,
    session_count: null,
    capacity_min: null,
    capacity_max: null,
    level: null,
    age_min: null,
    age_max: null,
    requires_identity: false,
    requires_manual_confirmation: false,
    published_at: null,
    paused_at: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    street_address: "123 Rue Privée",
    stripe_account_id: "acct_secret",
  });
  assert.ok(mapped);
  assert.equal("createdBy" in (mapped ?? {}), false);
  assert.equal("streetAddress" in (mapped ?? {}), false);
  assert.equal("stripeAccountId" in (mapped ?? {}), false);
  assert.equal(JSON.stringify(mapped).includes("acct_secret"), false);
  assert.equal(JSON.stringify(mapped).includes("123 Rue"), false);
});

test("no Stripe/payment/checkout/booking files changed", () => {
  const forbidden = [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/payments/ledger.ts",
    "lib/pricing/bookingCharge.ts",
    "components/BookingModal.tsx",
    "components/TeacherProfile.tsx",
  ];
  for (const rel of forbidden) {
    const src = read(rel);
    assert.doesNotMatch(src, /from ["']@\/lib\/offers/);
    assert.doesNotMatch(src, /\/api\/teacher\/offers/);
  }
});

test("no Mes formules / formules product label introduced", () => {
  const files = [
    LIST_ROUTE,
    ITEM_ROUTE,
    AUTH,
    VALIDATION,
    "lib/offers/types.ts",
    "lib/offers/teacherOfferDto.ts",
    "lib/offers/sanitizeTeacherOfferInput.ts",
    "lib/offers/statusTransitions.ts",
    "lib/offers/sortTeacherOffers.ts",
  ];
  for (const rel of files) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
    assert.doesNotMatch(src, /\bannonces\b/);
    assert.doesNotMatch(src, /\bclassifieds\b/);
  }
});

test("item route does not trust client status timestamps", () => {
  assert.match(ITEM_SRC, /teacher_id, created_by, created_at, updated_at/);
  assert.match(ITEM_SRC, /buildTeacherOfferStatusPatch/);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:teacher-offers-crud-api] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
