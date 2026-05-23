import assert from "node:assert/strict";
import {
  EMAIL_FALLBACK_LOCALE,
  inferEmailLocaleFromRegion,
  resolveEmailLocale,
} from "@/lib/email/locale";
import { getBookingEmailCopy } from "@/lib/email/messages/booking";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("profile locale es wins over region", () => {
  assert.equal(
    resolveEmailLocale({ profileLocale: "es", countryCode: "CA", region: "ON" }),
    "es",
  );
});

test("Uruguay infers es", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "UY" }), "es");
  assert.equal(resolveEmailLocale({ countryCode: "UY" }), "es");
});

test("Ontario infers en", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "ON" }), "en");
  assert.equal(resolveEmailLocale({ countryCode: "CA", region: "Ontario" }), "en");
});

test("Québec infers fr", () => {
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "QC" }), "fr");
  assert.equal(inferEmailLocaleFromRegion({ countryCode: "CA", region: "Québec" }), "fr");
  assert.equal(resolveEmailLocale({ countryCode: "CA", region: "Quebec" }), "fr");
});

test("unknown region falls back to fr", () => {
  assert.equal(resolveEmailLocale({}), EMAIL_FALLBACK_LOCALE);
  assert.equal(resolveEmailLocale({ countryCode: "FR" }), EMAIL_FALLBACK_LOCALE);
});

test("booking subject lines differ by locale", () => {
  const fr = getBookingEmailCopy("fr");
  const en = getBookingEmailCopy("en");
  const es = getBookingEmailCopy("es");

  assert.match(fr.confirmedStudent.subject("Marie"), /Cours réservé/);
  assert.match(en.confirmedStudent.subject("Marie"), /Lesson booked/);
  assert.match(es.confirmedStudent.subject("Marie"), /Clase reservada/);

  assert.match(fr.postClassReview.community, /communauté Pratiqo/);
  assert.doesNotMatch(fr.postClassReview.community, /\$1|1 \$/);
});

test("decline-student subject differs by locale", () => {
  const fr = getBookingEmailCopy("fr");
  const en = getBookingEmailCopy("en");
  const es = getBookingEmailCopy("es");

  assert.match(fr.declinedStudent.subject("Marie"), /Réservation refusée — Marie/);
  assert.match(en.declinedStudent.subject("Marie"), /Booking declined — Marie/);
  assert.match(es.declinedStudent.subject("Marie"), /Reserva rechazada — Marie/);
});

test("cancellation-student subject (teacher cancelled) differs by locale", () => {
  const fr = getBookingEmailCopy("fr");
  const en = getBookingEmailCopy("en");
  const es = getBookingEmailCopy("es");

  assert.match(fr.cancelledStudent.subject("Marie"), /Cours annulé — Marie/);
  assert.match(en.cancelledStudent.subject("Marie"), /Lesson cancelled — Marie/);
  assert.match(es.cancelledStudent.subject("Marie"), /Clase cancelada — Marie/);
});

test("cancellation-teacher subject (student cancelled) differs by locale", () => {
  const fr = getBookingEmailCopy("fr");
  const en = getBookingEmailCopy("en");
  const es = getBookingEmailCopy("es");

  assert.match(fr.cancelledTeacher.subject("Alex"), /Cours annulé — Alex/);
  assert.match(en.cancelledTeacher.subject("Alex"), /Lesson cancelled — Alex/);
  assert.match(es.cancelledTeacher.subject("Alex"), /Clase cancelada — Alex/);
});

// The cancel route stamps a refund plan into bookings.refund_status but does
// NOT execute Stripe refunds today (see TODO in cancel/route.ts). The email
// copy must therefore stay neutral about refunds. This regression check
// guards against well-meaning copy edits that would promise money back.
test("decline and cancellation copy never promises a refund", () => {
  const REFUND_PROMISE = /\b(refund|remboursement|reembolso|reembolsado|refunded)\b/i;

  for (const locale of ["fr", "en", "es"] as const) {
    const copy = getBookingEmailCopy(locale);

    const declineBlob = [
      copy.declinedStudent.subject("Marie"),
      copy.declinedStudent.heroTitle,
      copy.declinedStudent.heroSubtitle("Marie"),
      copy.declinedStudent.intro("Alex", "Marie"),
      copy.declinedStudent.reassurance,
      copy.declinedStudent.paymentNote,
      copy.declinedStudent.nextStep,
      copy.declinedStudent.cta,
    ].join("\n");

    const cancelStudentBlob = [
      copy.cancelledStudent.subject("Marie"),
      copy.cancelledStudent.heroTitle,
      copy.cancelledStudent.heroSubtitle("Marie", "1 jan", "10:00"),
      copy.cancelledStudent.intro("Alex", "Marie"),
      copy.cancelledStudent.paymentNote,
      copy.cancelledStudent.nextStep,
      copy.cancelledStudent.cta,
    ].join("\n");

    const cancelTeacherBlob = [
      copy.cancelledTeacher.subject("Alex"),
      copy.cancelledTeacher.heroTitle,
      copy.cancelledTeacher.heroSubtitle("Alex", "1 jan", "10:00"),
      copy.cancelledTeacher.intro("Marie", "Alex"),
      copy.cancelledTeacher.slotNote,
      copy.cancelledTeacher.cta,
    ].join("\n");

    assert.doesNotMatch(declineBlob, REFUND_PROMISE, `decline copy [${locale}] promises a refund`);
    assert.doesNotMatch(
      cancelStudentBlob,
      REFUND_PROMISE,
      `cancel-student copy [${locale}] promises a refund`,
    );
    assert.doesNotMatch(
      cancelTeacherBlob,
      REFUND_PROMISE,
      `cancel-teacher copy [${locale}] promises a refund`,
    );
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[email:locale] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
