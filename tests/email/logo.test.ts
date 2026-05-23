/**
 * Email logo regression suite.
 *
 * Context: Gmail showed a broken-image icon in Pratiqo's transactional
 * emails because the layout pointed at `${SITE_URL}/logo-email.png` which
 * never existed in `public/`. This test pins the contract so a future
 * rename, env swap, or accidental SVG re-introduction is caught at CI time
 * — not by a user complaining about a broken trust signal in their inbox.
 */
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Ensure deterministic appBaseUrl resolution for the test run. We force the
// production canonical so the assertions on absolute HTTPS URLs hold even if
// the developer has APP_BASE_URL pointed at a preview deployment locally.
process.env.APP_BASE_URL = "https://www.pratiqo.ca";

import {
  EMAIL_LOGO_ALT,
  EMAIL_LOGO_DISPLAY_WIDTH,
  EMAIL_LOGO_PATH,
  buildEmail,
  emailLogoUrl,
} from "@/lib/email/layout";
import { buildLessonPaymentReceiptEmail } from "@/lib/email/templates/booking";
import {
  buildIdentityFailedEmail,
  buildIdentityVerifiedEmail,
} from "@/lib/email/templates/identity";
import { buildProUpgradeEmail } from "@/lib/email/templates/billing";
import { buildCompanionEvolutionEmail } from "@/lib/email/templates/welcome";
import { buildReviewPublishedTeacherEmail } from "@/lib/email/templates/reviews";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const EXPECTED_LOGO_URL = "https://www.pratiqo.ca/images/email/pratiqo-email-logo.png";

function assertLogoIsEmailSafe(html: string, label: string) {
  // 1. Absolute HTTPS URL — never relative, never http://.
  assert.match(
    html,
    /src="https:\/\/[^"]+\/images\/email\/pratiqo-email-logo\.png"/,
    `${label}: missing absolute HTTPS logo src`,
  );

  // 2. The exact production-canonical URL must appear.
  assert.ok(
    html.includes(`src="${EXPECTED_LOGO_URL}"`),
    `${label}: logo src does not match expected production URL ${EXPECTED_LOGO_URL}`,
  );

  // 3. No relative URL like src="/images/..." (Gmail can't resolve those).
  assert.doesNotMatch(
    html,
    /<img[^>]+src="\/(?!\/)[^"]*"/,
    `${label}: contains a relative <img src="/..."> — Gmail cannot resolve`,
  );

  // 4. No SVG logo anywhere in the email body. Gmail strips SVG silently and
  //    several Outlook + Apple Mail versions render them as a broken icon.
  assert.doesNotMatch(
    html,
    /<img[^>]+src="[^"]+\.svg"/i,
    `${label}: SVG <img> detected — strip and use a PNG`,
  );

  // 5. Alt text is exactly "Pratiqo" (brand-readable fallback when images
  //    are blocked by the client or by user preference).
  assert.match(
    html,
    new RegExp(`alt="${EMAIL_LOGO_ALT}"`),
    `${label}: logo <img> alt text is not "${EMAIL_LOGO_ALT}"`,
  );

  // 6. Width attribute is present and matches the canonical display size.
  //    Spec width="auto"/missing breaks layout in Outlook.
  assert.match(
    html,
    new RegExp(`width="${EMAIL_LOGO_DISPLAY_WIDTH}"`),
    `${label}: logo <img> width attribute is not ${EMAIL_LOGO_DISPLAY_WIDTH}`,
  );

  // 7. Sanity: no legacy /logo-email.png lurking anywhere.
  assert.doesNotMatch(
    html,
    /\/logo-email\.png/,
    `${label}: legacy /logo-email.png URL still present`,
  );
}

test("emailLogoUrl returns the absolute production-canonical PNG path", () => {
  const url = emailLogoUrl();
  assert.equal(url, EXPECTED_LOGO_URL);
  assert.equal(EMAIL_LOGO_PATH, "/images/email/pratiqo-email-logo.png");
  assert.ok(url.startsWith("https://"), "logo URL must be HTTPS");
  assert.ok(!url.endsWith(".svg"), "logo URL must not end with .svg");
});

test("buildEmail layout renders an email-safe logo for every email", () => {
  // buildEmail is the single chokepoint for every transactional template
  // (welcome, booking confirmed/cancelled/declined, reminders, receipt,
  // identity, pro upgrade, companion, review-published, admin alerts).
  // Verifying it here transitively covers all of them.
  const html = buildEmail({
    heroTitle: "Hello",
    bodyHtml: "<p>Hi</p>",
  });
  assertLogoIsEmailSafe(html, "buildEmail");
});

test("lesson payment receipt email includes the fixed logo", () => {
  const html = buildLessonPaymentReceiptEmail({
    email: "student@example.com",
    studentName: "Sam",
    receiptNumber: "PRQ-2026-ABC",
    paymentDate: "May 18, 2026",
    lessonDescription: "Piano · 60 min",
    teacherName: "Ada",
    amountPaid: "$75.00",
    currency: "CAD",
    stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
    locale: "en",
  }).html;
  assertLogoIsEmailSafe(html, "lessonPaymentReceipt");
});

test("identity verified + identity failed emails include the fixed logo", () => {
  const verified = buildIdentityVerifiedEmail({ name: "Ariane", locale: "en" }).html;
  assertLogoIsEmailSafe(verified, "identityVerified");

  const failed = buildIdentityFailedEmail({
    name: "Ariane",
    reason: "document_unreadable",
    locale: "en",
  }).html;
  assertLogoIsEmailSafe(failed, "identityFailed");
});

test("pro upgrade notification email includes the fixed logo", () => {
  const html = buildProUpgradeEmail({ name: "Marc", locale: "en" }).html;
  assertLogoIsEmailSafe(html, "proUpgrade");
});

test("companion evolution notification email includes the fixed logo", () => {
  const html = buildCompanionEvolutionEmail({
    name: "Camille",
    companionName: "La Forêt",
    oldEmoji: "🌱",
    newEmoji: "🌿",
    oldStage: "La Graine",
    newStage: "La Pousse",
    locale: "en",
  }).html;
  assertLogoIsEmailSafe(html, "companionEvolution");
});

test("review-published notification email includes the fixed logo", () => {
  const html = buildReviewPublishedTeacherEmail({
    teacherName: "Marc",
    rating: 5,
    reviewContent: "Très bon cours.",
    studentFirstName: "Sofia",
    reviewId: "review_123",
    locale: "en",
  }).html;
  assertLogoIsEmailSafe(html, "reviewPublishedTeacher");
});

test("logo asset file exists on disk and is a non-trivial PNG", () => {
  // This is the test that would have caught the original bug: even though the
  // template referenced /logo-email.png, no asset by that name lived in
  // public/. We pin the exact path used by emailLogoUrl() to disk presence.
  const expectedPath = resolve(process.cwd(), "public", EMAIL_LOGO_PATH.replace(/^\//, ""));
  assert.ok(
    existsSync(expectedPath),
    `Email logo asset missing on disk at ${expectedPath} — emails will render a broken-image icon`,
  );

  const stats = statSync(expectedPath);
  assert.ok(stats.isFile(), `${expectedPath} is not a file`);
  // Anything below ~1 KB is almost certainly an empty/placeholder/corrupt
  // PNG — guard against that too.
  assert.ok(
    stats.size > 1024,
    `Email logo at ${expectedPath} is suspiciously small (${stats.size} bytes)`,
  );
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[email:logo] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
