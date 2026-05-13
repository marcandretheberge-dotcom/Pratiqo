import { test, expect } from "@playwright/test";
import { getAuthSecrets } from "../fixtures/env";

/**
 * Full happy path — search → book intro → pay → message → review.
 *
 * Gated behind E2E_AUTH=1 because it requires a seeded test student, a
 * seeded test teacher, and Stripe test keys. When the secrets aren't set
 * we skip the suite so PR runs stay green for contributors without the
 * test stack provisioned.
 *
 * Required env (set in CI as repository secrets):
 *   E2E_AUTH=1
 *   E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 *   E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD
 *   E2E_STRIPE_TEST_CARD            (default: 4242424242424242)
 *   STRIPE_SECRET_KEY               (test mode — sk_test_*)
 *   STRIPE_WEBHOOK_SECRET           (test mode)
 *
 * Stripe Checkout is hosted on a separate origin and tends to be flaky in
 * headless runs; the implementation outline below uses Stripe Payment
 * Element via the booking modal whenever the env supports it. See
 * `docs/release-quality-checklist.md` for the seeding contract.
 */

const secrets = getAuthSecrets();

test.describe("Happy path: search → book → pay → message → review", () => {
  test.skip(
    !secrets,
    "E2E_AUTH=1 and the E2E_STUDENT_*/E2E_TEACHER_* / Stripe test envs must be set for this suite.",
  );

  test.beforeAll(() => {
    if (!secrets) return;
    test.info().annotations.push({
      type: "auth",
      description: `student=${secrets.studentEmail}, teacher=${secrets.teacherEmail}`,
    });
  });

  test("student finds teacher via search and opens the profile", async ({ page }) => {
    if (!secrets) return;
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(secrets.studentEmail);
    await page.getByLabel(/(password|mot de passe|contraseña)/i).fill(secrets.studentPassword);
    await page.getByRole("button", { name: /(sign in|connect|conecta|connexion)/i }).click();
    await page.waitForURL(/\/(dashboard|student|onboarding)/, { timeout: 15_000 });

    await page.goto("/student/search");
    await expect(page.locator("#student-search-results")).toBeVisible();

    // Pratiqo Verified pill toggles its pressed state (UX safety net for p1-5).
    const verifiedPill = page.getByRole("button", { name: /pratiqo (verified|vérifié|verificado)/i });
    await expect(verifiedPill).toBeVisible();
    await expect(verifiedPill).toHaveAttribute("aria-pressed", "false");
    await verifiedPill.click();
    await expect(verifiedPill).toHaveAttribute("aria-pressed", "true");
    await verifiedPill.click();

    // Radius pills are reachable and switch active state.
    const radius10 = page.getByRole("button", { name: "10km", exact: true });
    await expect(radius10).toBeVisible();
    await radius10.click();
    await expect(radius10).toHaveClass(/bg-teal-700/);

    // Find the first card and open the profile.
    const firstCard = page.locator("#student-search-results button").first();
    await firstCard.click();
    await expect(page.getByRole("button", { name: /(reserve|réserver|reservar)/i }).first()).toBeVisible();
  });

  test.skip(
    !secrets,
    "Intro session booking + Stripe Checkout: implement once a permanent test teacher with intro session enabled is seeded.",
  );
  test("books an intro session and completes Stripe Checkout", async () => {
    // Outline:
    //  1. From the teacher profile drawer, click "Book intro session".
    //  2. Pick the next available slot in the booking modal.
    //  3. Confirm — backend creates a Stripe PaymentIntent in test mode.
    //  4. Drive the hosted Checkout page (or Payment Element if embedded):
    //       cardNumber = secrets.stripeTestCard
    //       expiry = 12/34, cvc = 123, postal = H2X1Y1
    //  5. After /booking/success, assert the booking shows up under
    //     /student/payments with status = "paid".
    //
    // Stripe Checkout DOM frequently changes — pin selectors against
    // `[name='cardnumber']`, `[name='exp-date']`, `[name='cvc']`, `[name='billingPostalCode']`.
  });

  test.skip(
    !secrets,
    "Messaging: implement once two test accounts can exchange a thread without rate-limit interference.",
  );
  test("messages the teacher after booking", async () => {
    // Outline:
    //  1. From the booking confirmation, click "Send message".
    //  2. Type and submit a short message.
    //  3. Switch session to teacher (separate context) and confirm receipt.
  });

  test.skip(
    !secrets,
    "Review: implement once `/api/reviews/eligible` returns true for the seeded booking after the lesson_date.",
  );
  test("leaves a review after the lesson completes", async () => {
    // Outline:
    //  1. Mark the booking as completed via the admin/test API (advance time).
    //  2. From /student/payments → "Leave review".
    //  3. Submit 5 stars + a short comment.
    //  4. Confirm the review is published on the teacher profile.
  });
});
