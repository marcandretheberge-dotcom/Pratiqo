/**
 * Public Teacher Profile “Offres de cours” section.
 * Display-only. No Stripe, booking, checkout, or search-card coverage.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TranslationKey } from "../../lib/i18n/types";
import {
  formatPublicTeacherOfferPriceLabel,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
} from "../../lib/offers/display";
import {
  filterPublishedPublicTeacherOffers,
  mapPublicTeacherOfferRow,
  publicTeacherOfferHasForbiddenKeys,
  TEACHER_OFFER_PUBLIC_SELECT_COLUMNS,
  type PublicTeacherOfferDto,
} from "../../lib/offers/publicTeacherOfferDto";
import { t as translate } from "../../lib/translations";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PROFILE = "components/TeacherProfile.tsx";
const SECTION = "components/teacher/PublicTeacherOffersSection.tsx";
const CARD = "components/teacher/PublicTeacherOfferCard.tsx";
const DTO = "lib/offers/publicTeacherOfferDto.ts";
const FETCH = "lib/offers/publicOffers.ts";
const SEARCH = "app/(app)/student/search/page.tsx";
const LANDING_CARD = "components/marketing/LandingTeacherListingCard.tsx";
const BOOKING = "components/BookingModal.tsx";

const t = (key: TranslationKey) => translate(key, "fr");

function publishedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    teacher_id: "11111111-1111-4111-8111-111111111111",
    title: "Cours de piano",
    slug: null,
    short_description: "Cours privé en ligne.",
    description: "Travail technique et répertoire, séance après séance.",
    discipline_id: "piano",
    specialite: null,
    offer_type: "private_lesson",
    format: "online",
    status: "published",
    image_url: null,
    price_cents: 7000,
    currency: "CAD",
    duration_minutes: 60,
    session_count: null,
    capacity_min: 1,
    capacity_max: 1,
    level: "Débutant",
    age_min: null,
    age_max: null,
    requires_identity: false,
    requires_manual_confirmation: false,
    cancellation_preference: "standard",
    reschedule_preference: "standard",
    published_at: "2026-08-19T12:00:00.000Z",
    updated_at: "2026-08-19T12:00:00.000Z",
    ...overrides,
  };
}

test("TeacherProfile shows Offres de cours when published offers exist", () => {
  assert.equal(existsSync(join(ROOT, SECTION)), true);
  assert.equal(existsSync(join(ROOT, CARD)), true);
  assert.match(read(PROFILE), /PublicTeacherOffersSection/);
  assert.match(read(PROFILE), /teacherId=\{teacher\.id\}/);
  assert.equal(t("publicTeacherOffersSection"), "Offres de cours");
  assert.match(read(SECTION), /t\("publicTeacherOffersSection"\)/);
  assert.match(read(SECTION), /offers\.length === 0\) return null/);
});

test("TeacherProfile hides the offer section when no published offers exist", () => {
  const src = read(SECTION);
  assert.match(src, /if \(offers\.length === 0\) return null/);
  assert.doesNotMatch(src, /n’a pas encore créé d’offres|does not have any course offers/i);
});

test("draft paused and archived offers are not shown", () => {
  const teacherId = "11111111-1111-4111-8111-111111111111";
  const rows = [
    publishedRow({ status: "draft", published_at: null, title: "Draft" }),
    publishedRow({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "paused", title: "Paused" }),
    publishedRow({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", status: "archived", published_at: null, title: "Archived" }),
    publishedRow({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", title: "Live" }),
  ];
  const offers = filterPublishedPublicTeacherOffers(rows, teacherId);
  assert.equal(offers.length, 1);
  assert.equal(offers[0].title, "Live");
  assert.equal(mapPublicTeacherOfferRow(publishedRow({ status: "draft", published_at: null })), null);
  assert.equal(mapPublicTeacherOfferRow(publishedRow({ status: "paused" })), null);
  assert.equal(mapPublicTeacherOfferRow(publishedRow({ status: "archived", published_at: null })), null);
});

test("offer cards show title type format price and description", () => {
  const card = read(CARD);
  assert.match(card, /offer\.title/);
  assert.match(card, /TeacherOfferCoverImage/);
  assert.match(card, /offer\.imageUrl/);
  assert.match(card, /formatTeacherOfferTypeLabel/);
  assert.match(card, /formatTeacherOfferFormatLabel/);
  assert.match(card, /formatPublicTeacherOfferPriceLabel/);
  assert.match(card, /preview/);
  assert.equal(formatTeacherOfferTypeLabel("private_lesson", t), "Cours privé");
  assert.equal(formatTeacherOfferFormatLabel("online", t), "En ligne");
  assert.equal(formatTeacherOfferTypeLabel("package", t), "Forfait");
  const offer: Pick<PublicTeacherOfferDto, "offerType" | "priceCents"> = {
    offerType: "private_lesson",
    priceCents: 7000,
  };
  assert.match(formatPublicTeacherOfferPriceLabel(offer, t, "fr"), /\/h/);
  assert.doesNotMatch(formatPublicTeacherOfferPriceLabel(offer, t, "fr"), /price_cents|private_lesson/);
});

test("raw technical values are not shown to learners", () => {
  const card = read(CARD);
  assert.doesNotMatch(card, />private_lesson<|>in_person<|>price_cents</);
  assert.match(card, /formatTeacherOfferTypeLabel/);
  assert.match(card, /formatTeacherOfferFormatLabel/);
});

test("created_by private address and Stripe fields are not exposed", () => {
  assert.doesNotMatch(TEACHER_OFFER_PUBLIC_SELECT_COLUMNS, /created_by|created_at|paused_at|archived_at|address|stripe/);
  assert.doesNotMatch(read(FETCH), /created_by|address|stripe_/);
  const mapped = mapPublicTeacherOfferRow(
    publishedRow({ created_by: "user-1", address: "12 rue", stripe_account_id: "acct_1" }),
  );
  assert.ok(mapped);
  assert.equal(publicTeacherOfferHasForbiddenKeys(mapped), false);
  assert.equal("createdBy" in mapped, false);
  assert.equal("createdAt" in mapped, false);
  assert.equal("pausedAt" in mapped, false);
  assert.equal("archivedAt" in mapped, false);
  assert.equal("address" in mapped, false);
});

test("offer-specific booking CTA is not rendered", () => {
  for (const rel of [SECTION, CARD, PROFILE]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Réserver cette offre|Choisir cette offre|Acheter ce forfait|Ajouter au panier/);
    assert.doesNotMatch(src, /teacher_offer_id/);
  }
  assert.match(read(CARD), /publicTeacherOffersShowDetails/);
  assert.match(read(PROFILE), /openBooking\("standard"\)/);
  assert.match(read(PROFILE), /teacher\.pricePerLesson/);
});

test("public search cards do not fetch or render offers", () => {
  const search = read(SEARCH);
  const landing = read(LANDING_CARD);
  assert.doesNotMatch(search, /PublicTeacherOffersSection|fetchPublishedTeacherOffers/);
  assert.doesNotMatch(landing, /PublicTeacherOffersSection|fetchPublishedTeacherOffers/);
  assert.match(search, /When teacher_offers launches/);
});

test("no checkout payment booking server files or public catalog changed", () => {
  for (const rel of [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/pricing/bookingCharge.ts",
    BOOKING,
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /PublicTeacherOffersSection/);
    assert.doesNotMatch(src, /fetchPublishedTeacherOffers/);
  }
  assert.equal(existsSync(join(ROOT, "app/(app)/offres/page.tsx")), false);
  assert.equal(existsSync(join(ROOT, "app/offres/page.tsx")), false);
  assert.doesNotMatch(read(FETCH), /getSupabaseAdmin|service_role|SERVICE_ROLE/);
});

test("no Mes formules / formules product label introduced", () => {
  for (const rel of [PROFILE, SECTION, CARD, DTO, FETCH, "lib/i18n/locales/fr.json"]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
    assert.doesNotMatch(src, /\bannonces\b/);
  }
  assert.match(read("lib/i18n/locales/fr.json"), /"teacherOffersTypePackage": "Forfait"/);
  assert.match(read("lib/i18n/locales/fr.json"), /"publicTeacherOffersSection": "Offres de cours"/);
});

test("public DTO mapper expects only published offers", () => {
  const fetchSrc = read(FETCH);
  assert.match(fetchSrc, /\.eq\("status", "published"\)/);
  assert.match(fetchSrc, /\.not\("published_at", "is", null\)/);
  assert.match(fetchSrc, /filterPublishedPublicTeacherOffers/);
  assert.equal(mapPublicTeacherOfferRow(publishedRow({ published_at: null })), null);
});

test("offer fetch failure does not crash the profile", () => {
  const src = read(SECTION);
  assert.match(src, /catch \{/);
  assert.match(src, /setOffers\(\[\]\)/);
  assert.match(read(FETCH), /if \(error \|\| !Array\.isArray\(data\)\) return \[\]/);
  assert.match(read(PROFILE), /PublicTeacherOffersSection/);
  assert.match(read(PROFILE), /from "@\/lib\/offers\/bookingOfferSelection"/);
});

test("legacy Réserver maintenant still uses profile booking widget", () => {
  assert.match(read(PROFILE), /t\("bookNow"\)/);
  assert.match(read(PROFILE), /openBooking\("standard"\)/);
  assert.doesNotMatch(read("components/teacher/BookingOfferSelectionSummary.tsx"), /onBook/);
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:public-teacher-profile-offers] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
