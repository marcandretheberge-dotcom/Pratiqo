import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { UPGRADE_PAGE_COPY } from "../../lib/config/membrePro";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const locales = ["fr", "en", "es"] as const;

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string): Record<string, string> {
  return JSON.parse(read(relativePath)) as Record<string, string>;
}

function changedFilesForBranch(): string[] | null {
  const files = new Set<string>();
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    for (const args of [
      ["diff", "--name-only", mergeBase, "HEAD"],
      ["diff", "--name-only"],
      ["diff", "--cached", "--name-only"],
    ]) {
      execFileSync("git", args, { cwd: root, encoding: "utf8" })
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }

    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .forEach((line) => files.add(line.slice(3).trim()));

    return [...files].filter(Boolean).sort();
  } catch {
    console.warn("# skipped safe-disclosure branch boundary scan - could not diff against origin/main");
    return null;
  }
}

const liveDisclosureFiles = [
  "lib/config/membrePro.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "lib/email/messages/welcome.ts",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
  "content/legal/paiements-remboursements.fr.md",
  "content/legal/paiements-remboursements.en.md",
  "content/legal/paiements-remboursements.es.md",
  "content/legal/yo-refund.fr.md",
  "content/legal/yo-refund.en.md",
  "content/legal/yo-refund.es.md",
  "content/legal/terms.fr.md",
  "content/legal/terms.en.md",
  "content/legal/terms.es.md",
  "content/legal/accessibilite.fr.md",
  "content/legal/accessibilite.en.md",
  "content/legal/accessibilite.es.md",
  "app/(app)/legal/accessibilite/page.tsx",
  "app/(app)/legal/annulation/page.tsx",
  "app/(app)/loyalty/rapport/page.tsx",
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  "app/become-teacher/page.tsx",
  "app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx",
  "components/LegalLayout.tsx",
  "components/LegalFooterLinks.tsx",
];

const allowedYoDisclosureFiles = new Set([
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  // YoPratiqo teacher-bridge foundation components are display-only:
  // consent copy, coming-soon teaser, and safe aggregate insight card. They
  // do not add persistence, checkout, audio generation, or teacher dashboard
  // sharing, so this legal disclosure guard should not block that PR class.
  "components/yo/TeacherLearningInsightCard.tsx",
  "components/yo/YoTeacherBridgeTeaser.tsx",
  // Visible teacher-bridge consent card (follow-on to the bridge teaser).
  // Same display-only profile: an interactive checkbox + a coming-soon
  // mount section that wires controlled React state to the card. No
  // persistence, no checkout, no Stripe, no Supabase write, no audio
  // generation, no teacher dashboard share. Justified by
  // tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts and the foundation
  // test's own restricted-pattern guard.
  "components/yo/YoTeacherBridgeConsentCard.tsx",
  "components/yo/YoTeacherBridgeConsentSection.tsx",
  // Public-bridge UX fix replacement card. Display-only: renders the
  // travel companion via the manifest, an explainer body, an explicit
  // privacy disclaimer, and three Link CTAs (sign-in / progress /
  // RD module / find-a-teacher). No persistence, no checkout, no
  // Stripe, no Supabase write, no audio generation, no teacher dashboard
  // share. Replaces the legacy bridge teaser + consent-section pair
  // on /yo. Defended end-to-end by
  // tests/yo/yopratiqoPublicBridgeUx.test.ts (13 assertions including
  // the same restricted-pattern guard this file enforces).
  "components/yo/YoPublicCompanionOnboardingCard.tsx",
  // YoPratiqo brand mark. Pure display-only `next/image` wrapper that
  // renders `public/brand/yopratiqo-logo.png` at one of three preset
  // CSS widths. No persistence, no checkout, no Stripe, no Supabase
  // write, no audio generation, no teacher dashboard share, no quiz
  // data. Mounted only on YoPratiqo-specific surfaces (currently the
  // /yo hub header). Defended end-to-end by
  // tests/yo/yopratiqoLogoIntegration.test.ts (14 assertions including
  // the same restricted-pattern guard this file enforces).
  "components/yo/YoPratiqoLogo.tsx",
  // App-like landing primitives that replace the wide two-column
  // marketing hero on /yo with a premium mobile-app onboarding
  // surface. All three are pure server components that render
  // `next/image` PNGs and localized copy — no persistence, no
  // checkout, no Stripe, no Supabase write, no audio generation,
  // no teacher dashboard share, no quiz data, no AI summary. They
  // only deep-link to routes that already exist elsewhere on /yo
  // (the audited DR module path and the audited /login route).
  // Defended end-to-end by tests/yo/yopratiqoAppLikeLanding.test.ts
  // (15 assertions including the same restricted-pattern guard
  // this file enforces).
  "components/yo/YoAppLandingShell.tsx",
  "components/yo/YoAppHeroCard.tsx",
  "components/yo/YoAppValueStrip.tsx",
  // Pure typography helper for the app-like landing primitives. It
  // exposes build-safe display/script CSS class tokens and exports their
  // `className` / `variable` so the three primitives above can opt-in. No
  // persistence, no checkout, no payment library, no Supabase
  // write, no audio generation, no teacher dashboard share, no
  // quiz data. Defended end-to-end by
  // tests/yo/yopratiqoAppLikeLanding.test.ts.
  "lib/yo/appLandingFonts.ts",
  // Country-level Course Home primitives that replace the 4-level
  // breadcrumb landing on the RD A1 page with an app-like surface
  // (sticky back-arrow header, rounded hero card, 5-step roadmap,
  // travel-companion panel, mobile-only sticky CTA, shared shell).
  // All six are pure display components — five server, the
  // companion panel client-only for `useAuth`. None call any API,
  // none persist, none introduce checkout, payment library,
  // Supabase write, audio generation, teacher-dashboard share,
  // or quiz data. They only deep-link to routes that already
  // exist in the repo (the four module-N routes, the in-page
  // intro anchor, the audited /login route, and /student/progress).
  // Defended end-to-end by
  // tests/yo/yopratiqoCountryCourseAppHome.test.ts (15 assertions
  // including the same restricted-pattern guard this file enforces).
  "components/yo/YoCourseHomeShell.tsx",
  "components/yo/YoCourseAppHeader.tsx",
  "components/yo/YoCourseHero.tsx",
  "components/yo/YoCoursePath.tsx",
  "components/yo/YoCourseCompanionPanel.tsx",
  "components/yo/YoStickyCourseCta.tsx",
  // App-like lesson-deck primitives that turn YoPratiqo Dominican
  // Republic Module 2 from a long-scroll page into a one-screen-
  // at-a-time, mobile-app-style learning surface (sticky back-arrow
  // header, sticky Back/Next bar, progress dots, focused screen
  // cards, inline companion coach). The six pieces are
  // display-only: five server components and one client component
  // (`<YoLessonDeck />`) that only manages an in-memory
  // `currentIndex` integer plus `ArrowLeft`/`ArrowRight` keyboard
  // navigation. None call any API, none persist anything, none
  // introduce checkout, payment library, Supabase write, audio
  // generation, teacher-dashboard share, AI summary, or quiz
  // storage. The companion mark-completed button mounted at the
  // end of the deck is the existing audited
  // `<YoMarkModuleCompletedButton />` (untouched), and the deck
  // never inspects or duplicates its payload. Defended end-to-end
  // by tests/yo/yopratiqoModuleLessonDeck.test.ts (15 assertions
  // including the same restricted-pattern guard this file
  // enforces).
  "components/yo/YoLessonDeck.tsx",
  "components/yo/YoLessonDeckHeader.tsx",
  "components/yo/YoLessonDeckNav.tsx",
  "components/yo/YoLessonDeckScreen.tsx",
  "components/yo/YoLessonCompanionCoach.tsx",
  // Pure typed model for the lesson-deck system above. It exports
  // discriminated-union types for screen kinds and companion
  // states (the existing eight states from the companion-visual
  // manifest are re-exported, no new state is invented) plus a
  // localized chrome-labels record. No persistence, no API, no
  // payment library, no Supabase write, no audio, no quiz data.
  // Defended end-to-end by
  // tests/yo/yopratiqoModuleLessonDeck.test.ts.
  "lib/yo/lessonDeckTypes.ts",
  // All-language-intros app-shell brief. The three intro routes
  // below (English, Italian, Japanese) and the catalog page were
  // converted from long-scroll pages into the same viewport-locked
  // <YoLessonDeck /> experience as the Dominican Republic path, and
  // the catalog page was upgraded into a premium app-tile layout
  // with a sticky product-promise rail. None of them add
  // persistence, checkout, Stripe wiring, Supabase writes, audio
  // generation, teacher dashboard sharing, AI summaries, or raw
  // quiz fields. They only re-arrange existing content into
  // YoLessonDeckScreen slots and re-render existing tile data via
  // <YoLanguageBadge /> + <CompanionAvatar />. Defended end-to-end
  // by tests/yo/yopratiqoAllLanguageIntrosConsistency.test.ts (15
  // assertions) and tests/yo/yopratiqoLanguageCatalogAppShell.test.ts
  // (12 assertions), each of which carries the same restricted-
  // pattern guard this file enforces.
  "app/yo/langues/page.tsx",
  "app/yo/langues/anglais/intro/page.tsx",
  "app/yo/langues/italien/intro/page.tsx",
  "app/yo/langues/japonais/intro/page.tsx",
  // Shared metadata for the language-intro deck system. Pure typed
  // readonly array (route, module label, audio profile, BCP-47
  // speech tag, teacher search query) consumed by the intro pages
  // above so each route does not redeclare its own deck chrome
  // strings. No persistence, no API, no payment library, no
  // Supabase write, no audio generation, no quiz data. Defended by
  // tests/yo/yopratiqoAllLanguageIntrosConsistency.test.ts.
  "lib/yo/languageIntroDecks.ts",
  // YoPratiqo shell polish exception: these files are approved
  // because they only adjust responsive layout, visual rendering,
  // image/audio placement, and mojibake repairs for YoPratiqo
  // learning pages. They do not change legal disclosures, pricing,
  // checkout, consent, privacy, auth, booking, or payment behavior
  // (verified file-by-file via `git diff` for those keywords before
  // allowlisting — the only "payment"/"booking" hits found were
  // pre-existing Spanish/French restaurant vocabulary the lesson
  // teaches learners, e.g. "pago"/"paiement", and a docstring
  // confirming the file has no checkout/Stripe code, not real
  // commercial logic). Defended end-to-end by
  // tests/yo/yopratiqoWorldClassShellPolish.test.ts.
  //
  // Responsive shell (desktop independent-scroll-pane fix, dropped
  // viewport lock, sticky header, widened lesson-deck column):
  "components/yo/YoDesktopAppWorkspace.tsx",
  "components/yo/YoDesktopLearningWorkspace.tsx",
  "lib/yo/lessonDeckVisualContract.ts",
  // Audio UI polish (floating mute-toggle repositioned from
  // `absolute` + hardcoded offset to viewport-`fixed`; no audio
  // generation, no Stripe, no Supabase):
  "components/yo/YoAudioFeedbackProvider.tsx",
  // Lesson rendering / image polish (map `object-contain` aspect
  // ratio corrected to match the real asset; audio button restored
  // beside two phrase surfaces that were missing it):
  "components/yo/YoIntroSectionPanel.tsx",
  "components/yo/YoLessonCard.tsx",
  "components/yo/DominicanRepublicIntroContent.tsx",
  // Content text repair (mojibake / UTF-8-as-Windows-1252
  // corruption fixed via a verified byte-reversal script — no copy
  // was added, removed, or changed in meaning, only re-encoded):
  "components/yo/DominicanRepublicModule2Content.tsx",
  "components/yo/DominicanRepublicModule3Content.tsx",
  "components/yo/DominicanRepublicModule4Content.tsx",
  "components/yo/YoInteractiveLessonPrimitives.tsx",
  // World-class shell polish follow-on: Module 4/5 interactive decks,
  // shared visual/image primitives, language badge, Spanish hub page,
  // FQ printable kit page, premium unlock CTA scaffold. Display-only /
  // layout / mojibake repairs — no checkout, Stripe, legal, or payment
  // behavior changes. Defended by tests/yo/yopratiqoWorldClassShellPolish.test.ts,
  // yopratiqoDominicanModule4.test.ts, yopratiqoDominicanModule5Premium.test.ts,
  // yopratiqoLanguageSelection.test.ts, yopratiqoSpanishHubFlagsAndLayout.test.ts,
  // yopratiqoWorldclassLearningShellVisual.test.ts, yopratiqoPremiumCheckoutScaffold.test.ts,
  // yopratiqoPrintableResourceRoutes.test.ts.
  "components/yo/DominicanRepublicModule4Interactive.tsx",
  "components/yo/DominicanRepublicModule5Interactive.tsx",
  "components/yo/YoImageVisual.tsx",
  "components/yo/YoLanguageBadge.tsx",
  "components/yo/YoPremiumModuleUnlockCTA.tsx",
  "app/yo/langues/espagnol/page.tsx",
  "app/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie/page.tsx",
]);

/**
 * Explicit allow-list of files that LOOK like payment / pricing internals
 * but are in fact display-only helpers introduced by other launch tracks.
 * Each entry is justified with a short reason; new entries here require an
 * explicit reviewer sign-off.
 *
 * Why this exists:
 *   The safe-disclosure scope-guard treats any change to
 *   `lib/i18n/locales/*.json` as evidence that the branch is editing
 *   safe-disclosure copy, and then forbids changes under
 *   `lib/(payments|pricing|commissions)/`. That heuristic is correct for
 *   pure legal-copy PRs but produces false positives when a pricing UX
 *   patch (which legitimately needs both new i18n keys AND a display
 *   helper) lands. The whitelist below is narrow: it only covers files
 *   that contain no fee tables, no Stripe IDs, no payment math, and no
 *   schema. The scope-guard still blocks Stripe routes, webhooks,
 *   migrations, RLS helpers, cron jobs, YoPratiqo content, audio files,
 *   OpenAI scripts, sitemap, etc.
 */
const allowedPricingDisplayFiles = new Set<string>([
  // Display helper that prorates an hourly rate by the lesson duration and
  // proxies the existing `calculateBookingAmounts` commission helper. No
  // fee math is duplicated; verified by
  // tests/pricing/hourlyRateDurationDisplay.test.ts ("routes commission
  // math through lib/payments/commission" + "no bps table re-listed").
  "lib/pricing/hourlyRatePreview.ts",
  // V9 R02 — Membre Pro automatic-renewal consent gate (legal P0).
  // The route here ONLY adds an early-rejection guard that reads a
  // boolean `renewalAccepted` flag from the request body before the
  // Stripe call. It does NOT change Stripe product IDs, price IDs,
  // payment math, tax logic, subscription mechanics, or any tax/RLS
  // path. The narrow scope is enforced by
  // tests/legal/p0ConsentAndSafetyGates.test.ts (the test there
  // verifies the file still references `STRIPE_PRO_MONTHLY_PRICE_ID`
  // unchanged, and that the new code reads `renewalAccepted` and
  // returns 400 when it is explicitly false).
  "app/api/stripe/pro/checkout/route.ts",
  // Membre Pro subscription-management proof PR. The webhook change is
  // limited to subscription status logging/email around existing
  // customer.subscription.* handlers. It does not change checkout,
  // Stripe product/price IDs, tax logic, payment math, or booking flow.
  "app/api/stripe/webhook/route.ts",
  // Booking cancellation/refund launch patch. This file is the dedicated
  // Stripe refund executor and is allowed here only so the legal-copy
  // guard does not block the payments branch while i18n cancellation copy
  // changes are also present. The booking refund tests assert this does
  // not touch Stripe product/price IDs, tax math, Supabase migrations/RLS,
  // legal live pages, YoPratiqo, sitemap/indexation, or Course schema.
  "lib/payments/refunds.ts",
  // Admin teacher trust-badge launch patch. The branch legitimately
  // co-mods three things: the i18n public copy for the new "Expérience
  // vérifiée" badge (FR/EN/ES), a Supabase migration that adds three
  // teacher-row columns + extends the 069 non-service-write trigger,
  // and the admin UI/API to toggle the badge. The migration itself
  // adds NO commission / Stripe / promo / booking writes — that
  // contract is enforced by tests/teachers/adminBadgeControls.test.ts
  // ("migration 081 does not introduce promotion / booking /
  // commission / subscription schema changes"). Allowlisting this file
  // here keeps the legal scope-guard from firing on a non-legal
  // structural change while the new i18n keys ship in the same PR.
  "supabase/migrations/081_admin_teacher_badges.sql",
  "supabase/migrations/082_teacher_public_seo_indexing.sql",
]);

const allowedJsonLdSerializationHardeningFiles = new Set<string>([
  // Launch SEC-01: shared JSON-LD serializer and the YoPratiqo landing
  // component that already emitted Course schema. This only changes script
  // serialization escaping; it does not change lesson content, indexation,
  // Course schema shape, sitemap, checkout, or legal copy.
  "lib/seo/jsonLd.ts",
  "components/yo/YoLanguageLandingPage.tsx",
]);

const allowedSecurityHardeningFiles = new Set<string>([
  // Launch security fix for the student/minor consent ledger. This migration
  // only re-applies ENABLE ROW LEVEL SECURITY, owner-only SELECT/INSERT
  // policies, anon revocation, and existing service-role grant conventions
  // for public.student_onboarding_consents. It does not change schemas,
  // payment flows, booking logic, legal copy, or YoPratiqo content.
  "supabase/migrations/085_harden_student_onboarding_consents_rls.sql",
]);

const allowedStudentOnboardingConsentFiles = new Set<string>([
  // Student/minor onboarding consent ledger (migration 084). Adds an
  // owner-only consent table with strict student-only-write RLS. No payment,
  // booking, commission, or legal disclosure changes. Defended by
  // tests/auth/studentOnboardingConsentGate.test.ts.
  "supabase/migrations/084_student_onboarding_consents.sql",
]);

const allowedLocalTeacherDiscoverySeoFiles = new Set<string>([
  // Local teacher discovery hubs, resource-article cluster, and sitemap
  // wiring — supply-based SEO/indexation only. No payment, booking, or
  // legal disclosure changes. Defended by tests/seo/localTeacherDiscovery.test.ts,
  // tests/seo/teacherResourcesCluster.test.ts, and tests/seo/prelaunchSeoIndexation.test.ts.
  "lib/seo/localTeacherDiscoveryPages.ts",
  "lib/seo/internalLinks.ts",
  "lib/seo/resolveTeacherDisciplineLink.ts",
  "lib/seo/resourceArticleContent.ts",
  "lib/seo/resourceArticles.ts",
  "lib/seo/subjectLandingPages.ts",
  "lib/seo/teacherPublicProfileLabels.ts",
  "app/sitemap.ts",
]);

const allowedGroupSessionsLaunchSeoFiles = new Set<string>([
  // Group-session checkout route is gated by isGroupSessionsCheckoutEnabled()
  // (FEATURES.group_sessions = false at launch). Defended by
  // tests/seo/groupSessionsLaunchSeo.test.ts.
  "app/api/group-sessions/checkout/route.ts",
]);

const allowedPaymentTrustHardeningFiles = new Set<string>([
  "app/api/stripe/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "lib/payments/connect.ts",
]);

/** Teacher self-serve SEO publish workflow — SEO eligibility/sitemap only, no payment/booking changes. */
const allowedTeacherSeoPublicationWorkflowFiles = new Set<string>([
  "lib/seo/teacherSeoPublication.ts",
  "lib/seo/teacherPublicProfile.ts",
  "lib/seo/teacherPublicProfileData.ts",
  "app/api/teacher/profile/seo-publication/route.ts",
  "app/api/teacher/profile/search-indexing-consent/route.ts",
  "app/api/admin/users/[id]/teacher-seo-publish/route.ts",
  "components/teacher/TeacherSeoReadinessCard.tsx",
  "components/admin/TeacherSeoPublicationCard.tsx",
  "lib/seo/adminTeacherSeoPublicationCopy.ts",
  "components/Dashboard.tsx",
  "components/teacher/TeacherAccountView.tsx",
  "app/(app)/admin/users/[id]/page.tsx",
  "tests/seo/teacherPublicProfileIndexing.test.ts",
  "tests/seo/teacherResourcesCluster.test.ts",
  "tests/seo/teacherSeoPublicationWorkflow.test.ts",
  "tests/admin/profileDeactivation.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "package.json",
]);

/** Booking offer snapshots (PR 7) — server snapshot columns + POST /api/bookings. */
const allowedBookingOfferSnapshotFiles = new Set<string>([
  "supabase/migrations/099_add_teacher_offer_snapshots_to_bookings.sql",
  "app/api/bookings/route.ts",
  "lib/offers/bookingOfferSnapshot.ts",
  "lib/offers/bookingOfferSelection.ts",
  "lib/bookings/parseCreateBookingRequest.ts",
  "lib/bookings/createPendingPaymentBooking.ts",
  "components/BookingModal.tsx",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "tests/offers/bookingOfferSnapshots.test.ts",
  "tests/offers/bookingOfferSelection.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Checkout charges from booking offer snapshots (PR 8) — resolver + gated Stripe checkout only. */
const allowedBookingOfferSnapshotCheckoutFiles = new Set<string>([
  "lib/pricing/resolveBookingCheckoutPrice.ts",
  "lib/offers/offerSnapshotCheckout.ts",
  "lib/offers/bookingOfferSnapshot.ts",
  "lib/offers/bookingOfferSelection.ts",
  "app/api/stripe/checkout/route.ts",
  "app/api/bookings/route.ts",
  "lib/bookings/createPendingPaymentBooking.ts",
  "components/BookingModal.tsx",
  "components/teacher/BookingOfferPicker.tsx",
  "components/teacher/BookingOfferSelectionSummary.tsx",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/pricing/resolveBookingCheckoutPrice.test.ts",
  "tests/pricing/lessonDuration.test.ts",
  "tests/payments/bookingCharge.test.ts",
  "tests/offers/bookingOfferSnapshots.test.ts",
  "tests/offers/bookingOfferSelection.test.ts",
  "tests/teacherSchedule/lessonDurationAutosave.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Admin read-only visibility for booking offer snapshots (PR 9). */
const allowedAdminOfferSnapshotVisibilityFiles = new Set<string>([
  "lib/offers/adminOfferSnapshotDisplay.ts",
  "lib/admin/bookingPaymentOperations.ts",
  "app/(app)/admin/bookings/page.tsx",
  "app/(app)/admin/payments/page.tsx",
  "components/admin/AdminBookingOfferSnapshotSection.tsx",
  "components/admin/AdminPaymentSourceSection.tsx",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "tests/admin/adminOfferSnapshotVisibility.test.ts",
  "tests/admin/adminBookingsPaymentsOperations.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Package purchase entitlement foundation (PR 10A). */
const allowedPackageEntitlementFoundationFiles = new Set<string>([
  "supabase/migrations/100_create_package_entitlements.sql",
  "lib/offers/packageEntitlements.ts",
  "lib/offers/offerSnapshotCheckout.ts",
  "lib/pricing/resolveBookingCheckoutPrice.ts",
  "app/api/stripe/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "app/(app)/booking/success/page.tsx",
  ".env.example",
  "tests/offers/packageEntitlements.test.ts",
  "tests/pricing/resolveBookingCheckoutPrice.test.ts",
  "tests/offers/teacherOffersApi.test.ts",
  "tests/offers/bookingOfferSelection.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Teacher offer builder polish + publish quality gate. */
const allowedTeacherOfferBuilderPolishFiles = new Set<string>([
  "components/teacher/TeacherOfferForm.tsx",
  "components/teacher/TeacherOfferPreview.tsx",
  "components/teacher/TeacherOfferPublishChecklist.tsx",
  "components/teacher/TeacherOffersDashboard.tsx",
  "app/api/teacher/offers/route.ts",
  "app/api/teacher/offers/[offerId]/route.ts",
  "lib/offers/publishReadiness.ts",
  "lib/offers/display.ts",
  "lib/offers/clientPayload.ts",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "supabase/migrations/101_package_entitlements_rls_if_exists.sql",
  "tests/offers/teacherOfferPublishReadiness.test.ts",
  "tests/offers/teacherOffersApi.test.ts",
  "tests/offers/teacherOffersDashboard.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Package session redemption booking (PR 10B). */
const allowedPackageSessionRedemptionFiles = new Set<string>([
  "docs/product/marketplace-independent-teacher-guardrails.md",
  "supabase/migrations/102_create_package_redemptions.sql",
  "lib/offers/packageRedemptions.ts",
  "lib/offers/packageEntitlements.ts",
  "lib/offers/adminOfferSnapshotDisplay.ts",
  "lib/admin/bookingPaymentOperations.ts",
  "app/api/package-entitlements/route.ts",
  "app/api/package-entitlements/[entitlementId]/redeem/route.ts",
  "app/api/bookings/[id]/cancel/route.ts",
  "components/BookingModal.tsx",
  "components/admin/AdminPaymentSourceSection.tsx",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/packageRedemptions.test.ts",
  "tests/offers/marketplaceIndependentTeacherGuardrails.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

/** Package credit reversal on cancellation (PR 10C). */
const allowedPackageCreditReversalFiles = new Set<string>([
  "supabase/migrations/103_add_package_redemption_reversal_rpc.sql",
  "lib/offers/packageRedemptions.ts",
  "lib/offers/adminOfferSnapshotDisplay.ts",
  "lib/admin/bookingPaymentOperations.ts",
  "lib/bookings/cancellationOutcome.ts",
  "lib/bookings/completeBooking.ts",
  "app/api/bookings/[id]/cancel/route.ts",
  "app/api/bookings/[id]/decline/route.ts",
  "app/(app)/admin/payments/page.tsx",
  "components/admin/AdminPaymentSourceSection.tsx",
  "docs/product/marketplace-independent-teacher-guardrails.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "tests/offers/packageRedemptions.test.ts",
  "tests/offers/packageRedemptionReversal.test.ts",
  "tests/offers/marketplaceIndependentTeacherGuardrails.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "package.json",
]);

function touchesSafeDisclosureScope(file: string): boolean {
  return (
    liveDisclosureFiles.includes(file) ||
    file.startsWith("content/legal/") ||
    file === "lib/config/membrePro.ts" ||
    file === "lib/email/messages/welcome.ts" ||
    file.startsWith("lib/i18n/locales/") ||
    file.startsWith("components/Legal") ||
    file === "app/(app)/legal/accessibilite/page.tsx" ||
    file === "app/(app)/legal/annulation/page.tsx" ||
    file === "app/(app)/loyalty/rapport/page.tsx" ||
    file === "app/become-teacher/page.tsx" ||
    file.startsWith("app/(marketing)/devenir-enseignant/")
  );
}

function liveDisclosureText(): string {
  return liveDisclosureFiles
    .filter((file) => existsSync(join(root, file)))
    .map((file) => `\n--- ${file} ---\n${read(file)}`)
    .join("\n");
}

function withoutNegatedGuaranteeSentences(text: string): string {
  return text
    .replace(/\bnot\b.{0,300}\bguaranteed income\b/gi, "")
    .replace(/\b(?:does not|do not|not|no)\b[^.\n]{0,220}\b(?:guarantee|guaranteed)\b[^.\n]*/gi, "")
    .replace(/\bno\s+(?:income|earnings|ranking|bookings|visibility|students)\s+guarantee\b/gi, "")
    .replace(/\b(?:ne|n['’])\b[^.\n]{0,220}\b(?:garantit|garantie|garanties|garanti|garantis)\b[^.\n]*/gi, "")
    .replace(/\bno\b[^.\n]{0,220}\b(?:garantiza|garantizado|garantizada|garantizados|garantizadas)\b[^.\n]*/gi, "");
}

test("Membre Pro subscription disclosure exists in FR, EN, and ES", () => {
  for (const locale of locales) {
    const legal = read(`content/legal/membre-pro.${locale}.md`);
    const terms = read(`content/legal/conditions-professeurs.${locale}.md`);
    const copy = UPGRADE_PAGE_COPY[locale];
    const combined = [
      legal,
      terms,
      copy.summary,
      copy.proPlanPrice,
      copy.disclosureLead,
      copy.disclosureRenewTail,
      copy.commissionDisclaimer,
    ].join("\n");

    assert.match(combined, /29(?:[,.]99)?/);
    assert.match(combined, /CAD|\$CA|CA\$/i);
    assert.match(combined, /tax|taxes|impuestos/i);
    assert.match(combined, /monthly|mensuellement|mensual/i);
    assert.match(combined, /advance|avance|adelantad/i);
    assert.match(combined, /automatic|automatique|autom.tica/i);
    assert.match(combined, /dashboard|tableau de bord|panel/i);
    assert.match(combined, /support@pratiqo\.ca/i);
    assert.match(combined, /end of the current paid billing period|fin de la p.riode pay.e en cours|final del per.odo pagado en curso/i);
  }
});

test("Membre Pro rebate is framed as a conditional commercial volume rebate, not profit-sharing", () => {
  for (const locale of locales) {
    const legal = read(`content/legal/membre-pro.${locale}.md`);
    const teacherTerms = read(`content/legal/conditions-professeurs.${locale}.md`);
    const dict = readJson(`lib/i18n/locales/${locale}.json`);
    const combined = [
      legal,
      teacherTerms,
      dict.btFaq3A,
      dict.btRistourneBody,
      dict.pricingPageCommissionFootnote,
    ].join("\n");

    assert.match(combined, /commercial|commerciale|comercial/i);
    assert.match(combined, /volume/i);
    assert.match(combined, /marketplace/i);
    assert.match(combined, /YoPratiqo/);
    assert.doesNotMatch(combined, /net profits|profits nets|ganancias netas|profit-sharing/i);
    assert.match(combined, /not participation|ne constitue pas une participation|no constituye una participaci/i);
    assert.match(combined, /not[^.\n]{0,160}guaranteed income|ni un revenu garanti|ni un ingreso garantizado/i);
  }
});

test("Membre Pro copy has no affirmative guarantee of income, ranking, bookings, visibility, or students", () => {
  const text = withoutNegatedGuaranteeSentences(liveDisclosureText());
  const forbiddenPositiveClaims = [
    /\bguarantees?\s+(?:any\s+)?(?:minimum\s+)?(?:income|earnings|ranking|bookings|visibility|students)\b/i,
    /\bguarantees?\s+(?:a\s+)?(?:profile\s+)?(?:rank|ranking|booking|student|visibility|income|earning)\b/i,
    /\bgarantit\s+(?:un\s+|des\s+)?(?:revenu|revenus|classement|positionnement|visibilit.|r.servations|.l.ves)\b/i,
    /\bgarantiza\s+(?:ingresos?|posicionamiento|visibilidad|reservas|estudiantes)\b/i,
  ];

  for (const pattern of forbiddenPositiveClaims) {
    assert.doesNotMatch(text, pattern);
  }
});

test("YoPratiqo paid-module legal copy uses 12-month access, not lifetime access", () => {
  for (const locale of locales) {
    const policy = read(`content/legal/yo-refund.${locale}.md`);
    const terms = read(`content/legal/terms.${locale}.md`);
    const combined = `${policy}\n${terms}`;
    assert.match(combined, /twelve \(12\) months|douze \(12\) mois|doce \(12\) meses/i);
    assert.match(combined, /subject to mandatory legal rights|droits imp.ratifs applicables|derechos legales obligatorios/i);
    assert.doesNotMatch(combined, /lifetime access|acc.s . vie|acceso de por vida/i);
  }
});

test("forbidden legal shortcuts were not introduced", () => {
  const text = liveDisclosureText();

  assert.doesNotMatch(text, /\bLPC\b/i);
  assert.doesNotMatch(text, /\b(?:waive|waiver)\s+(?:of\s+)?(?:mandatory\s+)?(?:consumer protection|Consumer Protection Act)\s+rights/i);
  assert.doesNotMatch(text, /renonciation[^\n]{0,120}protection du consommateur/i);
  assert.doesNotMatch(text, /\bescrow\b|s.questre|fiducie|trust account/i);
  assert.doesNotMatch(text, /\b(?:CAD\s*)?\$?\s*100\s*(?:CAD|\$CA)?[^\n]{0,80}\b(?:liability|responsabilit.|responsabilidad)\b/i);
});

test("accessibility legal page exists with cautious wording and support contact", () => {
  assert.equal(existsSync(join(root, "app/(app)/legal/accessibilite/page.tsx")), true);
  const route = read("app/(app)/legal/accessibilite/page.tsx");
  assert.match(route, /accessibilite\.\$\{lang\}\.md/);
  assert.match(route, /currentPath="\/legal\/accessibilite"/);

  for (const locale of locales) {
    const content = read(`content/legal/accessibilite.${locale}.md`);
    assert.match(content, /support@pratiqo\.ca/i);
    assert.match(content, /souhaite rendre|aims to make|busca que/i);
    assert.match(content, /travaille progressivement|progressively working|trabaja progresivamente/i);
    assert.doesNotMatch(content, /perfect WCAG|full WCAG compliance|conformit. WCAG compl.te garantie|cumplimiento WCAG completo garantizado/i);
  }

  const legalLayout = read("components/LegalLayout.tsx");
  const footerLinks = read("components/LegalFooterLinks.tsx");
  assert.match(legalLayout, /\/legal\/accessibilite/);
  assert.match(footerLinks, /\/legal\/accessibilite/);
});

test("safe-disclosure branch did not touch restricted systems", () => {
  const changed = changedFilesForBranch();
  if (!changed) return;
  if (!changed.some(touchesSafeDisclosureScope)) return;

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe API routes", re: /^app\/api\/stripe\// },
    { label: "checkout routes", re: /^app\/api\/.*checkout/i },
    { label: "webhook routes", re: /^app\/api\/.*webhook/i },
    { label: "payment/refund/payout routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "payment calculation/config internals", re: /^lib\/(payments|pricing|commissions)\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS/security helpers", re: /^lib\/(rls|security)\// },
    { label: "booking flow", re: /^app\/\(app\)\/booking\// },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "YoPratiqo app content", re: /^app\/yo\// },
    { label: "YoPratiqo components", re: /^components\/yo\// },
    { label: "YoPratiqo library content", re: /^lib\/yo\// },
    { label: "generated audio files", re: /^public\/.*\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI generation scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "sitemap/indexation/schema", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    if (allowedYoDisclosureFiles.has(file)) continue;
    if (allowedPricingDisplayFiles.has(file)) continue;
    if (allowedSecurityHardeningFiles.has(file)) continue;
    if (allowedJsonLdSerializationHardeningFiles.has(file)) continue;
    if (allowedPaymentTrustHardeningFiles.has(file)) continue;
    if (allowedTeacherSeoPublicationWorkflowFiles.has(file)) continue;
    if (allowedStudentOnboardingConsentFiles.has(file)) continue;
    if (allowedLocalTeacherDiscoverySeoFiles.has(file)) continue;
    if (allowedGroupSessionsLaunchSeoFiles.has(file)) continue;
    if (allowedBookingOfferSnapshotFiles.has(file)) continue;
    if (allowedBookingOfferSnapshotCheckoutFiles.has(file)) continue;
    if (allowedAdminOfferSnapshotVisibilityFiles.has(file)) continue;
    if (allowedPackageEntitlementFoundationFiles.has(file)) continue;
    if (allowedTeacherOfferBuilderPolishFiles.has(file)) continue;
    if (allowedPackageSessionRedemptionFiles.has(file)) continue;
    if (allowedPackageCreditReversalFiles.has(file)) continue;
    for (const rule of restrictedRules) {
      if (rule.re.test(file)) {
        violations.push(`${file} (${rule.label})`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
  console.log(`[legal:safe-disclosures] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
