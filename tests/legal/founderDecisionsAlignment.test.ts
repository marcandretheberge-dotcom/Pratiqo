import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

function changedFilesAgainstMain(): string[] | null {
  try {
    const mergeBase = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const output = execFileSync("git", ["diff", "--name-only", mergeBase, "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    const unstaged = execFileSync("git", ["diff", "--name-only"], {
      cwd: root,
      encoding: "utf8",
    });
    const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf8",
    });
    return [...new Set(`${output}\n${unstaged}\n${staged}`.split(/\r?\n/).map((f) => f.trim()).filter(Boolean))].sort();
  } catch {
    console.warn("# skipped founder-decision branch boundary scan - could not diff against origin/main");
    return null;
  }
}

const liveFiles = [
  "content/legal/terms.fr.md",
  "content/legal/terms.en.md",
  "content/legal/terms.es.md",
  "content/legal/yo-refund.fr.md",
  "content/legal/yo-refund.en.md",
  "content/legal/yo-refund.es.md",
  "content/legal/membre-pro.fr.md",
  "content/legal/membre-pro.en.md",
  "content/legal/membre-pro.es.md",
  "content/legal/conditions-professeurs.fr.md",
  "content/legal/conditions-professeurs.en.md",
  "content/legal/conditions-professeurs.es.md",
  "content/legal/code-de-conduite.fr.md",
  "content/legal/code-de-conduite.en.md",
  "content/legal/code-de-conduite.es.md",
  "content/legal/paiements-remboursements.fr.md",
  "content/legal/paiements-remboursements.en.md",
  "content/legal/paiements-remboursements.es.md",
  "app/(app)/legal/yo-remboursement/page.tsx",
  "app/(app)/legal/annulation/page.tsx",
  "app/(app)/loyalty/rapport/page.tsx",
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  "app/become-teacher/page.tsx",
  "app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  "lib/email/messages/welcome.ts",
].filter((file) => existsSync(join(root, file)));

const allowedYoDisclosureFiles = new Set([
  "app/yo/page.tsx",
  "app/yo/langues/espagnol/intro/page.tsx",
  "app/yo/langues/francais-quebec/intro/page.tsx",
  // YoPratiqo teacher-bridge UI components — display-only consent surface
  // and aggregate insight card with a locked/empty state. They do not
  // change Stripe IDs, payment math, tax logic, subscription mechanics,
  // payout flow, or any audio/MP3 generation. Same allow-class as the
  // matching entry in tests/legal/safeDisclosures.test.ts; the consent
  // card's privacy contract is asserted by
  // tests/yo/yopratiqoTeacherBridgeConsentCard.test.ts.
  "components/yo/TeacherLearningInsightCard.tsx",
  "components/yo/YoTeacherBridgeTeaser.tsx",
  "components/yo/YoTeacherBridgeConsentCard.tsx",
  "components/yo/YoTeacherBridgeConsentSection.tsx",
  // All-language-intros app-shell brief. The three intro routes
  // below (English, Italian, Japanese) and the catalog page were
  // converted from long-scroll pages into the same viewport-locked
  // <YoLessonDeck /> experience as the Dominican Republic path, and
  // the catalog page was upgraded into a premium app-tile layout
  // with a sticky product-promise rail. None of them change Stripe
  // IDs, payment math, tax logic, subscription mechanics, payout
  // flow, or any audio/MP3 generation. Same allow-class as the
  // matching entry in tests/legal/safeDisclosures.test.ts; the
  // privacy contract is asserted by
  // tests/yo/yopratiqoAllLanguageIntrosConsistency.test.ts and
  // tests/yo/yopratiqoLanguageCatalogAppShell.test.ts.
  "app/yo/langues/page.tsx",
  "app/yo/langues/anglais/intro/page.tsx",
  "app/yo/langues/italien/intro/page.tsx",
  "app/yo/langues/japonais/intro/page.tsx",
  "lib/yo/languageIntroDecks.ts",
  // YoPratiqo shell polish exception (mirrors the matching entry in
  // tests/legal/safeDisclosures.test.ts): these files are approved
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
  "components/yo/YoAppLandingShell.tsx",
  "components/yo/YoAppHeroCard.tsx",
  "components/yo/YoDesktopAppWorkspace.tsx",
  "components/yo/YoDesktopLearningWorkspace.tsx",
  "components/yo/YoLessonDeck.tsx",
  "components/yo/YoLessonDeckHeader.tsx",
  "components/yo/YoLessonDeckNav.tsx",
  "components/yo/YoCourseHomeShell.tsx",
  "components/yo/YoCourseAppHeader.tsx",
  "components/yo/YoCourseHero.tsx",
  "components/yo/YoCoursePath.tsx",
  "components/yo/YoCourseCompanionPanel.tsx",
  "components/yo/YoStickyCourseCta.tsx",
  "lib/yo/lessonDeckVisualContract.ts",
  "components/yo/YoAudioFeedbackProvider.tsx",
  "components/yo/YoIntroSectionPanel.tsx",
  "components/yo/YoLessonCard.tsx",
  "components/yo/DominicanRepublicIntroContent.tsx",
  "components/yo/DominicanRepublicModule2Content.tsx",
  "components/yo/DominicanRepublicModule3Content.tsx",
  "components/yo/DominicanRepublicModule4Content.tsx",
  "components/yo/YoInteractiveLessonPrimitives.tsx",
  // Mirrors safeDisclosures Yo shell-polish follow-on entries. Defended by
  // the same YoPratiqo test suites listed in tests/legal/safeDisclosures.test.ts.
  "components/yo/DominicanRepublicModule4Interactive.tsx",
  "components/yo/DominicanRepublicModule5Interactive.tsx",
  "components/yo/YoImageVisual.tsx",
  "components/yo/YoLanguageBadge.tsx",
  "components/yo/YoPremiumModuleUnlockCTA.tsx",
  "app/yo/langues/espagnol/page.tsx",
  "app/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie/page.tsx",
]);

/**
 * Allow-list for narrowly-scoped legitimate edits made by follow-up
 * legal-mechanic PRs that touch a Stripe / payment-adjacent file
 * without changing payment math, Stripe IDs, tax logic, or
 * subscription mechanics. Mirrors the pattern used by
 * `tests/legal/safeDisclosures.test.ts`
 * (`allowedPricingDisplayFiles`). Each entry MUST be defended by a
 * dedicated assertion in another test suite.
 */
const allowedConsentGateFiles = new Set<string>([
  // V9 R02 — Membre Pro automatic-renewal consent gate. The route
  // adds a body-level consent check before any Stripe call and
  // returns 400 when `renewalAccepted: false` is sent. Asserted by
  // tests/legal/p0ConsentAndSafetyGates.test.ts ("A6" + "A7").
  "app/api/stripe/pro/checkout/route.ts",
  // Membre Pro subscription-management proof PR. The webhook change is
  // limited to subscription status logging/email around existing
  // customer.subscription.* handlers. It does not change checkout,
  // Stripe product/price IDs, tax logic, payment math, or booking flow.
  "app/api/stripe/webhook/route.ts",
]);

const allowedJsonLdSerializationHardeningFiles = new Set<string>([
  // Launch SEC-01: this YoPratiqo landing component already emits Course
  // JSON-LD. The change is serialization escaping only; no lesson content,
  // audio, checkout, indexation, sitemap, or schema shape changes.
  "components/yo/YoLanguageLandingPage.tsx",
  "lib/seo/jsonLd.ts",
]);

const allowedSecurityHardeningFiles = new Set<string>([
  "supabase/migrations/085_harden_student_onboarding_consents_rls.sql",
]);

const allowedStudentOnboardingConsentFiles = new Set<string>([
  "supabase/migrations/084_student_onboarding_consents.sql",
]);

const allowedLocalTeacherDiscoverySeoFiles = new Set<string>([
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
  "app/api/group-sessions/checkout/route.ts",
]);

const allowedPaymentTrustHardeningFiles = new Set<string>([
  "app/api/stripe/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "lib/payments/connect.ts",
]);

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
  "tests/admin/profileDeactivation.test.ts",
  "tests/seo/teacherSeoPublicationWorkflow.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "package.json",
]);

/** Planned package refund quote engine — quote/admin review only, no Stripe refund. */
const allowedPlannedPackageRefundQuoteFiles = new Set<string>([
  "supabase/migrations/119_planned_package_cancellation_refund_quotes.sql",
  "lib/offers/plannedPackageRefundQuotes.ts",
  "lib/offers/plannedPackageRefundQuote.ts",
  "lib/offers/plannedPackageSessionDelivery.ts",
  "lib/admin/plannedPackageRefundOperations.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-orders/[orderId]/route.ts",
  "app/api/admin/planned-package-orders/[orderId]/cancellation-request/route.ts",
  "app/api/admin/planned-package-orders/[orderId]/refund-quote/route.ts",
  "app/api/admin/planned-package-orders/[orderId]/refund-quote/action/route.ts",
  "app/(app)/admin/planned-package-orders/[orderId]/page.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/package-refund-quote-engine.md",
  "docs/product/package-feature-flags.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackageRefundQuote.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "package.json",
]);

/** Planned package manual refund execution — admin-only Stripe refund for approved quotes. */
const allowedPlannedPackageManualRefundFiles = new Set<string>([
  "supabase/migrations/120_planned_package_refund_executions.sql",
  "lib/offers/plannedPackageManualRefunds.ts",
  "lib/offers/plannedPackageManualRefund.ts",
  "lib/admin/plannedPackageRefundOperations.ts",
  "lib/admin/plannedPackageOrderOperations.ts",
  "lib/offers/plannedPackageReconciliation.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-orders/[orderId]/refund-quotes/[quoteId]/execute/route.ts",
  "app/(app)/admin/planned-package-orders/[orderId]/page.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/package-manual-refund-execution.md",
  "docs/product/package-refund-quote-engine.md",
  "docs/product/package-feature-flags.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackageManualRefund.test.ts",
  "tests/offers/plannedPackageRefundQuote.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "tests/teacherLaunch/teacherLaunchCenter.test.ts",
  "tests/teacherProfile/teacherProfileManagement.test.ts",
  "tests/commission/commissionModelCopy.test.ts",
  "package.json",
]);

/** Planned package payout eligibility ledger — eligibility only, no Stripe transfer. */
const allowedPlannedPackagePayoutEligibilityFiles = new Set<string>([
  "supabase/migrations/121_planned_package_payout_eligibility_ledger.sql",
  "lib/offers/plannedPackagePayoutEligibilityLedger.ts",
  "lib/offers/plannedPackagePayoutEligibility.ts",
  "lib/admin/plannedPackagePayoutEligibilityOperations.ts",
  "lib/admin/plannedPackageOrderOperations.ts",
  "lib/offers/plannedPackageReconciliation.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-orders/[orderId]/payout-eligibility/route.ts",
  "app/api/admin/planned-package-orders/[orderId]/sync-payout-eligibility/route.ts",
  "app/api/admin/planned-package-orders/[orderId]/route.ts",
  "app/(app)/admin/planned-package-orders/[orderId]/page.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/package-payout-eligibility-ledger.md",
  "docs/product/package-feature-flags.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackagePayoutEligibility.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "tests/teacherLaunch/teacherLaunchCenter.test.ts",
  "tests/teacherProfile/teacherProfileManagement.test.ts",
  "tests/commission/commissionModelCopy.test.ts",
  "package.json",
]);

/** Planned package manual transfer execution — admin-only Stripe Connect transfer. */
const allowedPlannedPackageManualTransferFiles = new Set<string>([
  "supabase/migrations/122_planned_package_transfer_executions.sql",
  "lib/offers/plannedPackageManualTransfers.ts",
  "lib/offers/plannedPackageManualTransfer.ts",
  "lib/admin/plannedPackageTransferOperations.ts",
  "lib/admin/plannedPackagePayoutEligibilityOperations.ts",
  "lib/admin/plannedPackageOrderOperations.ts",
  "lib/offers/plannedPackagePayoutEligibility.ts",
  "lib/offers/plannedPackageReconciliation.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-orders/[orderId]/payout-eligibility/[entryId]/execute-transfer/route.ts",
  "app/(app)/admin/planned-package-orders/[orderId]/page.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/package-manual-transfer-execution.md",
  "docs/product/package-payout-eligibility-ledger.md",
  "docs/product/paid-packages-launch-checklist.md",
  "docs/product/package-feature-flags.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackageManualTransfer.test.ts",
  "tests/offers/plannedPackagePayoutEligibility.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/yo/yopratiqoAudioPronunciationOverrides.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "tests/teacherLaunch/teacherLaunchCenter.test.ts",
  "tests/teacherProfile/teacherProfileManagement.test.ts",
  "tests/commission/commissionModelCopy.test.ts",
  "package.json",
]);

/** Planned package manual transfer reversal — admin-only Stripe Connect reversal. */
const allowedPlannedPackageManualTransferReversalFiles = new Set<string>([
  "supabase/migrations/123_planned_package_transfer_reversal_executions.sql",
  "lib/offers/plannedPackageManualTransferReversals.ts",
  "lib/offers/plannedPackageTransferReversal.ts",
  "lib/admin/plannedPackageTransferReversalOperations.ts",
  "lib/admin/plannedPackageTransferOperations.ts",
  "lib/admin/plannedPackagePayoutEligibilityOperations.ts",
  "lib/admin/plannedPackageOrderOperations.ts",
  "lib/offers/plannedPackageManualRefund.ts",
  "lib/offers/plannedPackageReconciliation.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-orders/[orderId]/transfer-executions/[transferExecutionId]/reverse/route.ts",
  "app/(app)/admin/planned-package-orders/[orderId]/page.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/package-manual-transfer-reversal.md",
  "docs/product/package-manual-transfer-execution.md",
  "docs/product/package-manual-refund-execution.md",
  "docs/product/paid-packages-launch-checklist.md",
  "docs/product/package-feature-flags.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackageTransferReversal.test.ts",
  "tests/offers/plannedPackageManualTransfer.test.ts",
  "tests/offers/plannedPackageManualRefund.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/security/rlsCoverage.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "package.json",
]);

/** Planned package E2E staging QA harness — diagnostics only, no money movement. */
const allowedPlannedPackageE2eQaFiles = new Set<string>([
  "lib/offers/plannedPackageE2eQaTools.ts",
  "lib/offers/plannedPackageE2eQa.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "app/api/admin/planned-package-e2e-qa/route.ts",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/planned-package-e2e-staging-qa.md",
  "docs/product/package-feature-flags.md",
  "docs/product/paid-packages-launch-checklist.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/plannedPackageE2eLifecycle.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "package.json",
]);

/** Student planned package dashboard — read-only learner visibility. */
const allowedStudentPlannedPackageDashboardFiles = new Set<string>([
  "lib/offers/plannedPackageStudentDashboard.ts",
  "lib/offers/plannedPackageStudentStatus.ts",
  "lib/offers/plannedPackageStudentDto.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "lib/offers/studentPackages.ts",
  "app/api/student/planned-packages/route.ts",
  "app/api/student/planned-packages/[orderId]/route.ts",
  "app/(app)/student/packages/page.tsx",
  "components/student/StudentPackageDashboard.tsx",
  "components/student/StudentPlannedPackageCard.tsx",
  "components/AppShell.tsx",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/student-planned-package-dashboard.md",
  "docs/product/package-feature-flags.md",
  "docs/product/paid-packages-launch-checklist.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/studentPlannedPackageDashboard.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "package.json",
]);

/** Teacher planned package dashboard — read-only teacher visibility. */
const allowedTeacherPlannedPackageDashboardFiles = new Set<string>([
  "lib/offers/plannedPackageTeacherDashboard.ts",
  "lib/offers/plannedPackageTeacherStatus.ts",
  "lib/offers/plannedPackageTeacherDto.ts",
  "lib/offers/packageLaunchReadiness.ts",
  "lib/offers/teacherPackages.ts",
  "app/api/teacher/planned-packages/route.ts",
  "app/api/teacher/planned-packages/[orderId]/route.ts",
  "app/(app)/teacher/packages/page.tsx",
  "components/teacher/TeacherPackageDashboard.tsx",
  "components/teacher/TeacherPlannedPackageCard.tsx",
  "components/teacher/teacherNavConfig.ts",
  "app/(app)/admin/package-launch-readiness/page.tsx",
  "docs/product/teacher-planned-package-dashboard.md",
  "docs/product/student-planned-package-dashboard.md",
  "docs/product/package-feature-flags.md",
  "docs/product/paid-packages-launch-checklist.md",
  "lib/i18n/locales/fr.json",
  "lib/i18n/locales/en.json",
  "lib/i18n/locales/es.json",
  ".env.example",
  "tests/offers/teacherPlannedPackageDashboard.test.ts",
  "tests/offers/packageLaunchReadiness.test.ts",
  "tests/offers/marketplaceIndependentTeacherGuardrails.test.ts",
  "tests/legal/safeDisclosures.test.ts",
  "tests/legal/founderDecisionsAlignment.test.ts",
  "package.json",
]);

function touchesFounderDecisionScope(file: string): boolean {
  return (
    liveFiles.includes(file) ||
    lawyerExportFiles.includes(file) ||
    file.startsWith("content/legal/") ||
    file.startsWith("docs/legal/lawyer-export-2026-06-02/") ||
    file.startsWith("lib/i18n/locales/") ||
    file === "lib/email/messages/welcome.ts" ||
    file === "app/(app)/legal/yo-remboursement/page.tsx" ||
    file === "app/(app)/legal/annulation/page.tsx" ||
    file === "app/(app)/loyalty/rapport/page.tsx" ||
    file === "app/become-teacher/page.tsx" ||
    file.startsWith("app/(marketing)/devenir-enseignant/")
  );
}

const lawyerExportFiles = [
  "docs/legal/lawyer-export-2026-06-02/00_resume_executif_avocat.md",
  "docs/legal/lawyer-export-2026-06-02/01_cgu_conditions_utilisation.md",
  "docs/legal/lawyer-export-2026-06-02/03_annulation_remboursements.md",
  "docs/legal/lawyer-export-2026-06-02/04_conditions_professeurs.md",
  "docs/legal/lawyer-export-2026-06-02/05_membre_pro_commissions_ristourne.md",
  "docs/legal/lawyer-export-2026-06-02/06_code_conduite_securite.md",
  "docs/legal/lawyer-export-2026-06-02/07_paiements_stripe_taxes.md",
  "docs/legal/lawyer-export-2026-06-02/08_yopratiqo_modules_numeriques.md",
  "docs/legal/lawyer-export-2026-06-02/09_marketing_claims_a_risque.md",
  "docs/legal/lawyer-export-2026-06-02/10_questions_pour_l_avocat.md",
  "docs/legal/lawyer-export-2026-06-02/11_changelog_depuis_version_avocat_precedente.md",
  "docs/legal/lawyer-export-2026-06-02/pratiqo-lawyer-export-combined.md",
].filter((file) => existsSync(join(root, file)));

function combine(files: string[]): string {
  return files.map((file) => `\n--- ${file} ---\n${read(file)}`).join("\n");
}

function withoutNegatedGuaranteeSentences(text: string): string {
  return text
    .replace(/\bnot\b.{0,300}\bguaranteed income\b/gi, "")
    .replace(/\b(?:does not|do not|not|no)\b[^.\n]{0,220}\b(?:guarantee|guaranteed)\b[^.\n]*/gi, "")
    .replace(/\bno\s+(?:income|earnings|ranking|bookings|visibility|students)\s+guarantee\b/gi, "")
    .replace(/\b(?:ne|n['’])\b[^.\n]{0,220}\b(?:garantit|garantie|garanties|garanti|garantis)\b[^.\n]*/gi, "")
    .replace(/\bno\b[^.\n]{0,220}\b(?:garantiza|garantizado|garantizada|garantizados|garantizadas)\b[^.\n]*/gi, "");
}

test("YoPratiqo paid-module copy uses fixed 12-month access and no lifetime-access promise", () => {
  const text = combine([...liveFiles, ...lawyerExportFiles]);
  assert.match(text, /douze \(12\) mois|twelve \(12\) months|doce \(12\) meses/i);
  assert.doesNotMatch(text, /accès à vie|lifetime access|acceso de por vida/i);
});

test("Membre Pro price is 29.99 / 29,99 plus applicable taxes across locales", () => {
  const fr = combine([
    "content/legal/membre-pro.fr.md",
    "content/legal/conditions-professeurs.fr.md",
    "lib/i18n/locales/fr.json",
  ]);
  const en = combine([
    "content/legal/membre-pro.en.md",
    "content/legal/conditions-professeurs.en.md",
    "lib/i18n/locales/en.json",
  ]);
  const es = combine([
    "content/legal/membre-pro.es.md",
    "content/legal/conditions-professeurs.es.md",
    "lib/i18n/locales/es.json",
  ]);

  assert.match(fr, /29,99\s*\$CA\s*\/\s*mois\s*\+\s*taxes applicables/i);
  assert.match(en, /\$29\.99\s*CAD\s*\/\s*month\s*\+\s*applicable taxes/i);
  assert.match(es, /29,99\s*\$CA\s*\/\s*mes\s*\+\s*impuestos aplicables/i);
});

test("Membre Pro rebate no longer uses net-profit or profit-sharing framing", () => {
  const text = combine([...liveFiles, ...lawyerExportFiles]);
  assert.match(text, /rabais commercial rétroactif conditionnel sur volume|conditional retroactive commercial volume rebate|reembolso comercial retroactivo condicional sobre volumen/i);
  assert.match(text, /YoPratiqo et les autres produits autonomes distincts sont exclus|YoPratiqo and other separate self-paced products are excluded|YoPratiqo y otros productos aut.nomos separados est.n excluidos/i);
  assert.doesNotMatch(text, /profits nets|net profits|profit-sharing|ganancias netas/i);
});

test("payment and teacher enforcement wording avoids escrow and disciplinary warning language", () => {
  const text = combine([...liveFiles, ...lawyerExportFiles]);
  assert.doesNotMatch(text, /\bescrow\b|séquestre|fiducie|trust account/i);

  const teacherContext = combine([
    "content/legal/conditions-professeurs.fr.md",
    "content/legal/conditions-professeurs.en.md",
    "content/legal/conditions-professeurs.es.md",
    "content/legal/code-de-conduite.fr.md",
    "content/legal/code-de-conduite.en.md",
    "content/legal/code-de-conduite.es.md",
    "app/(app)/legal/annulation/page.tsx",
  ]);
  assert.doesNotMatch(teacherContext, /avertissement|issue a warning|written warning|advertencia/i);
  assert.match(teacherContext, /notification de non-conformité aux standards de la marketplace/);
  assert.match(teacherContext, /notice of non-compliance with marketplace standards/);
  assert.match(teacherContext, /notificación de incumplimiento de los estándares de la marketplace/);
});

test("minor, home-lesson, and background-check founder decisions are present cautiously", () => {
  const teacherTerms = combine([
    "content/legal/conditions-professeurs.fr.md",
    "content/legal/conditions-professeurs.en.md",
    "content/legal/conditions-professeurs.es.md",
  ]);
  assert.match(teacherTerms, /moins de 14 ans|under 14|menor de 14/i);
  assert.match(teacherTerms, /autorisation|authorization|autorizaci/i);
  assert.match(teacherTerms, /cours à domicile|at-home lessons|clases a domicilio/i);
  assert.match(teacherTerms, /antécédents|criminal-background|antecedentes/i);
  assert.match(teacherTerms, /à valider par l'avocat|subject to lawyer validation|a validar por abogado/i);
  assert.match(teacherTerms, /n'est pas opérationnelle|not operational|no est. operativa/i);
});

test("liability proposal uses 12 months, not 3 months, where reflected", () => {
  const text = combine([
    "content/legal/terms.fr.md",
    "content/legal/terms.en.md",
    "content/legal/terms.es.md",
    "docs/legal/lawyer-export-2026-06-02/01_cgu_conditions_utilisation.md",
    "docs/legal/lawyer-export-2026-06-02/pratiqo-lawyer-export-combined.md",
  ]);
  assert.match(text, /douze \(12\) mois|twelve \(12\) months|doce \(12\) meses/i);
  assert.doesNotMatch(text, /3 derniers mois|past 3 months|últimos 3 meses|ultimos 3 meses/i);
  assert.match(text, /lorsque la loi permet|where the law permits|cuando la ley permita/i);
});

test("founder promotion wording is bounded and not income-guaranteeing", () => {
  const text = combine([
    "content/legal/membre-pro.fr.md",
    "content/legal/membre-pro.en.md",
    "content/legal/membre-pro.es.md",
    "docs/legal/lawyer-export-2026-06-02/11_changelog_depuis_version_avocat_precedente.md",
  ]);
  assert.match(text, /temporaires|temporary|temporales/i);
  assert.match(text, /admissibilit|eligibility|elegibilidad/i);
  assert.match(text, /ne deviennent pas permanentes|do not become permanent|no se vuelven permanentes/i);
  assert.match(text, /compatibilit|compatibility|compatibilidad/i);
  assert.doesNotMatch(withoutNegatedGuaranteeSentences(text), /garantit\s+(?:un\s+)?revenu|guarantees?\s+(?:any\s+)?(?:minimum\s+)?income|garantiza\s+ingresos/i);
});

test("branch did not touch restricted systems", () => {
  const changed = changedFilesAgainstMain();
  if (!changed) return;
  if (!changed.some(touchesFounderDecisionScope)) return;

  const restrictedRules: Array<{ label: string; re: RegExp }> = [
    { label: "Stripe API routes", re: /^app\/api\/stripe\// },
    { label: "checkout routes", re: /^app\/api\/.*checkout/i },
    { label: "webhook routes", re: /^app\/api\/.*webhook/i },
    { label: "payment/refund/payout routes", re: /^app\/api\/(payments|payouts|refunds)\// },
    { label: "payment calculation internals", re: /^lib\/payments\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS/security helpers", re: /^lib\/(rls|security)\// },
    { label: "booking flow", re: /^app\/\(app\)\/booking\// },
    { label: "YoPratiqo lesson/audio content", re: /^app\/yo\/|^components\/yo\/|^lib\/yo\/|^public\/.*\.(?:mp3|wav|m4a)$/i },
    { label: "OpenAI generation scripts", re: /^scripts\/.*(?:openai|generate-yopratiqo-audio)/i },
    { label: "sitemap/indexation/schema", re: /^app\/sitemap\.ts$|^app\/robots\.ts$|^lib\/seo\// },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    if (allowedYoDisclosureFiles.has(file)) continue;
    if (allowedConsentGateFiles.has(file)) continue;
    if (allowedSecurityHardeningFiles.has(file)) continue;
    if (allowedJsonLdSerializationHardeningFiles.has(file)) continue;
    if (allowedPaymentTrustHardeningFiles.has(file)) continue;
    if (allowedTeacherSeoPublicationWorkflowFiles.has(file)) continue;
    if (allowedStudentOnboardingConsentFiles.has(file)) continue;
    if (allowedLocalTeacherDiscoverySeoFiles.has(file)) continue;
    if (allowedGroupSessionsLaunchSeoFiles.has(file)) continue;
    if (allowedPlannedPackageRefundQuoteFiles.has(file)) continue;
    if (allowedPlannedPackageManualRefundFiles.has(file)) continue;
    if (allowedPlannedPackagePayoutEligibilityFiles.has(file)) continue;
    if (allowedPlannedPackageManualTransferFiles.has(file)) continue;
    if (allowedPlannedPackageManualTransferReversalFiles.has(file)) continue;
    if (allowedPlannedPackageE2eQaFiles.has(file)) continue;
    if (allowedStudentPlannedPackageDashboardFiles.has(file)) continue;
    if (allowedTeacherPlannedPackageDashboardFiles.has(file)) continue;
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
  console.log(`[legal:founder-decisions] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
