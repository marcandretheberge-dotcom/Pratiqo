/**
 * Gated booking offer selection foundation.
 * No Stripe, checkout, payment math, or booking server API changes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOOKING_OFFER_SELECTION_FLAG,
  buildBookingCreateOfferFields,
  bookingPayloadExcludesOfferIdentity,
  canSelectOfferForBooking,
  getSelectableBookingOffers,
  isBookingOfferSelectionEnabled,
  resolveBookingOfferSelection,
} from "../../lib/offers/bookingOfferSelection";
import type { PublicTeacherOfferDto } from "../../lib/offers/publicTeacherOfferDto";
import type { TranslationKey } from "../../lib/i18n/types";
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
const BOOKING = "components/BookingModal.tsx";
const OFFER_CARD = "components/teacher/PublicTeacherOfferCard.tsx";
const PICKER = "components/teacher/BookingOfferPicker.tsx";
const SELECTION = "lib/offers/bookingOfferSelection.ts";
const CHECKOUT = "app/api/stripe/checkout/route.ts";
const SEARCH = "app/(app)/student/search/page.tsx";

const t = (key: TranslationKey) => translate(key, "fr");

function publishedOffer(overrides: Partial<PublicTeacherOfferDto> = {}): PublicTeacherOfferDto {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    teacherId: "11111111-1111-4111-8111-111111111111",
    title: "Cours de piano",
    slug: null,
    shortDescription: "En ligne",
    description: null,
    disciplineId: "piano",
    specialite: null,
    offerType: "private_lesson",
    format: "online",
    status: "published",
    imageUrl: null,
    priceCents: 7000,
    currency: "CAD",
    durationMinutes: 60,
    sessionCount: null,
    capacityMin: 1,
    capacityMax: 1,
    level: null,
    ageMin: null,
    ageMax: null,
    requiresIdentity: false,
    requiresManualConfirmation: false,
    publishedAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:00:00.000Z",
    ...overrides,
  };
}

test("booking offer selection feature flag defaults OFF", () => {
  assert.equal(BOOKING_OFFER_SELECTION_FLAG, "NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION");
  assert.equal(isBookingOfferSelectionEnabled(), false);
  assert.match(read(SELECTION), /process\.env\.NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION === "true"/);
});

test("when flag OFF BookingModal does not show offer selection UI unconditionally", () => {
  const booking = read(BOOKING);
  assert.match(booking, /showOfferSelection = offerSelectionEnabled && selectableOffers\.length > 0/);
  assert.match(booking, /isBookingOfferSelectionEnabled\(\)/);
  assert.match(booking, /\{showOfferSelection \? \(/);
  assert.match(booking, /BookingOfferPicker/);
});

test("when flag OFF offer cards do not show live purchase CTAs", () => {
  const card = read(OFFER_CARD);
  assert.match(card, /isBookingOfferSelectionEnabled\(\)/);
  assert.doesNotMatch(card, /Choisir cette offre|Réserver cette offre|Acheter|Payer|Ajouter au panier/);
  assert.match(card, /bookingOfferSelectionPrepare/);
});

test("when flag OFF existing Réserver maintenant behavior remains unchanged", () => {
  assert.match(read(PROFILE), /openBooking\("standard"\)/);
  assert.match(read(PROFILE), /t\("bookNow"\)/);
  assert.match(read(PROFILE), /teacher\.pricePerLesson/);
  assert.match(read(BOOKING), /teacher\.pricePerLesson/);
});

test("published offers are selectable only when flag ON in UI wiring", () => {
  assert.match(read(OFFER_CARD), /showPrepareBooking = isBookingOfferSelectionEnabled\(\)/);
  assert.match(read(BOOKING), /getSelectableBookingOffers/);
  const teacherId = "11111111-1111-4111-8111-111111111111";
  const offers = [
    publishedOffer(),
    publishedOffer({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "draft", publishedAt: null }),
    publishedOffer({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", status: "paused" }),
  ];
  const selectable = getSelectableBookingOffers(offers, teacherId);
  assert.equal(selectable.length, 1);
  assert.equal(selectable[0].title, "Cours de piano");
});

test("draft paused and archived offers are never selectable", () => {
  const teacherId = "11111111-1111-4111-8111-111111111111";
  for (const status of ["draft", "paused", "archived"] as const) {
    const offer = publishedOffer({
      id: `${status}-offer-id000000000001`,
      status,
      publishedAt: status === "published" ? "2026-08-19T12:00:00.000Z" : null,
    });
    assert.equal(canSelectOfferForBooking(offer, teacherId), status === "published");
  }
  assert.equal(canSelectOfferForBooking(publishedOffer({ teacherId: "other" }), teacherId), false);
});

test("selected offer summary and picker render when enabled", () => {
  assert.match(read(PICKER), /booking-offer-picker/);
  assert.match(read(PICKER), /bookingOfferSelectionTitle/);
  assert.match(read(BOOKING), /BookingOfferSelectionSummary/);
  assert.match(read("components/teacher/BookingOfferSelectionSummary.tsx"), /booking-selected-offer-summary/);
  assert.match(read(BOOKING), /setSelectedOfferId/);
  assert.match(read(PICKER), /booking-offer-clear/);
});

test("BookingModal sends teacher_offer_id only via gated booking create helper, never to checkout", () => {
  const booking = read(BOOKING);
  assert.match(booking, /fetch\("\/api\/bookings"/);
  assert.match(booking, /buildBookingCreateOfferFields/);
  assert.match(booking, /Selected offers must not affect checkout payload amount or snapshot fields/);
  const checkoutBodyBlock = booking.match(/body: JSON\.stringify\(\{[\s\S]*?\}\),/);
  assert.ok(checkoutBodyBlock, "checkout JSON body should exist");
  assert.doesNotMatch(checkoutBodyBlock![0], /teacher_offer_id|teacherOfferId|offer_id|offerId/);
  assert.doesNotMatch(checkoutBodyBlock![0], /teacher_offer_title_snapshot/);
  const sampleCheckout = {
    teacher_id: "11111111-1111-4111-8111-111111111111",
    amount: 70,
    booking_details: { booking_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
  };
  assert.equal(bookingPayloadExcludesOfferIdentity(sampleCheckout), true);
  assert.deepEqual(buildBookingCreateOfferFields("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), {});
});

test("payment amount remains based on legacy teacher fields", () => {
  const booking = read(BOOKING);
  assert.match(booking, /teacher\.pricePerLesson/);
  assert.match(booking, /teacher\.defaultLessonDurationMinutes/);
  assert.match(booking, /teacher\.introSession/);
  const pricingBlock = booking.match(
    /const hourlyRate =[\s\S]*?const effectivePrice = payableAmountCents\(basePrice, creditsDiscount\) \/ 100;/,
  );
  assert.ok(pricingBlock, "legacy pricing block should exist");
  assert.doesNotMatch(pricingBlock![0], /selectedOffer|offer\.priceCents/);
});

test("checkout reads booking offer snapshots via central pricing resolver", () => {
  const checkout = read(CHECKOUT);
  assert.match(checkout, /resolveBookingCheckoutPrice\(/);
  assert.match(checkout, /teacher_offer_price_cents_snapshot/);
  assert.doesNotMatch(checkout, /BookingOfferPicker|bookingOfferSelection/);
  assert.doesNotMatch(read("app/api/stripe/webhook/route.ts"), /teacher_offer/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /teacher_offer/);
  assert.doesNotMatch(read("lib/pricing/bookingCharge.ts"), /teacher_offer/);
});

test("public search cards do not fetch or render offer selection", () => {
  const search = read(SEARCH);
  assert.doesNotMatch(search, /BookingOfferPicker|fetchPublishedTeacherOffers/);
  assert.doesNotMatch(search, /teacher-profile-offer-prepare-booking/);
});

test("no Mes formules / formules product label introduced", () => {
  for (const rel of [PROFILE, BOOKING, OFFER_CARD, PICKER, SELECTION, "lib/i18n/locales/fr.json"]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
  }
  assert.equal(t("bookingOfferSelectionTitle"), "Choisir une offre de cours");
});

test("resolveBookingOfferSelection clears invalid offer ids", () => {
  const teacherId = "11111111-1111-4111-8111-111111111111";
  const offers = [publishedOffer()];
  const resolved = resolveBookingOfferSelection(offers, teacherId, "not-a-valid-offer");
  assert.equal(resolved.selectedOfferId, null);
  assert.equal(resolved.selectedOffer, null);
  const picked = resolveBookingOfferSelection(offers, teacherId, offers[0].id);
  assert.equal(picked.selectedOffer?.title, "Cours de piano");
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:booking-offer-selection] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
