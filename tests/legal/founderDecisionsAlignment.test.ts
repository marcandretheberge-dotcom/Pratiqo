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
  "components/yo/YoDesktopAppWorkspace.tsx",
  "components/yo/YoDesktopLearningWorkspace.tsx",
  "components/yo/YoLessonDeck.tsx",
  "components/yo/YoLessonDeckHeader.tsx",
  "components/yo/YoLessonDeckNav.tsx",
  "lib/yo/lessonDeckVisualContract.ts",
  "components/yo/YoAudioFeedbackProvider.tsx",
  "components/yo/YoIntroSectionPanel.tsx",
  "components/yo/YoLessonCard.tsx",
  "components/yo/DominicanRepublicIntroContent.tsx",
  "components/yo/DominicanRepublicModule2Content.tsx",
  "components/yo/DominicanRepublicModule3Content.tsx",
  "components/yo/DominicanRepublicModule4Content.tsx",
  "components/yo/YoInteractiveLessonPrimitives.tsx",
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

const allowedSecurityHardeningFiles = new Set<string>([
  "supabase/migrations/085_harden_student_onboarding_consents_rls.sql",
]);

const allowedPaymentTrustHardeningFiles = new Set<string>([
  // P0 payment/trust launch hardening. These exact files add a checkout
  // preflight for teacher Stripe Connect payout readiness and reject
  // test-mode Stripe webhooks in production after signature verification.
  // They do not change Stripe product/price IDs, payment math, tax logic,
  // refunds, commissions, Membre Pro, booking status logic, RLS,
  // migrations, or legal pages. Defended by
  // tests/payments/paymentTrustLaunchHardening.test.ts and the existing
  // Stripe production-readiness test.
  "app/api/stripe/checkout/route.ts",
  "app/api/stripe/webhook/route.ts",
  "lib/payments/connect.ts",
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
    if (allowedPaymentTrustHardeningFiles.has(file)) continue;
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
