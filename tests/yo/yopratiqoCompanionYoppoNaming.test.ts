/**
 * YoPratiqo — companion / mascot naming contract (Yoppo).
 *
 * The YoPratiqo companion is officially named "Yoppo". This suite
 * locks the naming rules the brief mandates:
 *
 *   • Yoppo      = companion / mascot name
 *   • YoPratiqo  = product / app name
 *   • Pratiqo    = full platform
 *
 *   • DO NOT use "Yo" alone as a product name.
 *   • DO NOT rename YoPratiqo to Yoppo.
 *   • DO NOT rename Pratiqo to YoPratiqo.
 *
 * Where Yoppo must appear (student-facing companion UX):
 *   • YoStudentCompanionCard
 *   • YoCourseCompanionPanel
 *   • YoPublicCompanionOnboardingCard
 *   • YoStudentHubContent  (the /student/yopratiqo hub)
 *   • /student/progress YoPratiqo companion section
 *   • CompanionBridgeCard (consent-side, student-facing)
 *
 * Where Yoppo must NOT take over (teacher-facing must stay
 * professional):
 *   • TeacherLearningInsightCard
 *   • lib/yopratiqo/teacherBridgeCopy.ts
 *
 * Style: node:test-style static-source assertions. No browser, no
 * network, no Stripe / Supabase / RLS / migration / booking / search /
 * Membre Pro code touched.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const STUDENT_FACING_FILES = {
  studentCompanionCard: "components/yo/YoStudentCompanionCard.tsx",
  courseCompanionPanel: "components/yo/YoCourseCompanionPanel.tsx",
  publicCompanionOnboardingCard:
    "components/yo/YoPublicCompanionOnboardingCard.tsx",
  studentHubContent: "components/yo/YoStudentHubContent.tsx",
  progressPage: "app/(app)/student/progress/page.tsx",
  companionBridgeCard: "components/companion/CompanionBridgeCard.tsx",
} as const;

const TEACHER_FACING_FILES = {
  teacherLearningInsightCard: "components/yo/TeacherLearningInsightCard.tsx",
  teacherBridgeCopy: "lib/yopratiqo/teacherBridgeCopy.ts",
} as const;

const studentSrcs = Object.fromEntries(
  Object.entries(STUDENT_FACING_FILES).map(([key, path]) => [key, read(path)]),
) as Record<keyof typeof STUDENT_FACING_FILES, string>;

const studentCodes = Object.fromEntries(
  Object.entries(studentSrcs).map(([key, src]) => [key, stripJsComments(src)]),
) as Record<keyof typeof STUDENT_FACING_FILES, string>;

const teacherSrcs = Object.fromEntries(
  Object.entries(TEACHER_FACING_FILES).map(([key, path]) => [key, read(path)]),
) as Record<keyof typeof TEACHER_FACING_FILES, string>;

const teacherCodes = Object.fromEntries(
  Object.entries(teacherSrcs).map(([key, src]) => [key, stripJsComments(src)]),
) as Record<keyof typeof TEACHER_FACING_FILES, string>;

// ─── 1. Yoppo appears on every student-facing companion surface ────
test("every student-facing companion surface names the mascot 'Yoppo'", () => {
  for (const [key, code] of Object.entries(studentCodes)) {
    assert.ok(
      /\bYoppo\b/.test(code),
      `${key} (${STUDENT_FACING_FILES[key as keyof typeof STUDENT_FACING_FILES]}) must surface the 'Yoppo' mascot name`,
    );
  }
});

// ─── 2. The canonical Yoppo · compagnon YoPratiqo phrasing exists ──
test("the canonical FR / EN / ES Yoppo + YoPratiqo phrasing is present on at least one student-facing surface", () => {
  const allStudentCode = Object.values(studentCodes).join("\n");
  // FR — Yoppo + "compagnon YoPratiqo" (the brief's canonical phrase).
  assert.match(
    allStudentCode,
    /Yoppo[^.\n]*compagnon YoPratiqo/,
    "FR copy must use the canonical 'Yoppo, ton compagnon YoPratiqo' phrasing somewhere",
  );
  // EN — Yoppo + "YoPratiqo companion".
  assert.match(
    allStudentCode,
    /Yoppo[^.\n]*YoPratiqo companion/,
    "EN copy must use the canonical 'Yoppo, your YoPratiqo companion' phrasing somewhere",
  );
  // ES — Yoppo + "compañero YoPratiqo".
  assert.match(
    allStudentCode,
    /Yoppo[^.\n]*compañero YoPratiqo/,
    "ES copy must use the canonical 'Yoppo, tu compañero YoPratiqo' phrasing somewhere",
  );
});

// ─── 3. YoPratiqo is never renamed to Yoppo on student surfaces ────
test("Yoppo never replaces YoPratiqo as the product name on student-facing surfaces", () => {
  // Each surface must still mention YoPratiqo somewhere — Yoppo is
  // additive, never a replacement. We require BOTH tokens on every
  // student-facing companion surface so the brief's product / mascot
  // split is provably preserved.
  for (const [key, code] of Object.entries(studentCodes)) {
    assert.ok(
      /\bYoPratiqo\b/.test(code),
      `${key} must still mention YoPratiqo (mascot Yoppo never replaces the product name)`,
    );
  }
  // A forbidden anti-pattern: "Yoppo, your Yoppo companion" / similar
  // self-reference that would imply Yoppo is the product. We forbid
  // any "ton compagnon Yoppo" / "your Yoppo companion" framing that
  // does not also include YoPratiqo on the same line.
  const allStudentCode = Object.values(studentCodes).join("\n");
  const lines = allStudentCode.split("\n");
  for (const line of lines) {
    if (!/Yoppo/.test(line)) continue;
    // Lines that say "compagnon Yoppo" / "Yoppo companion" /
    // "compañero Yoppo" without "YoPratiqo" anywhere on the same
    // line would imply Yoppo is the product. Reject them.
    const selfReferentialFr = /\b(compagnon|compañero)\s+Yoppo\b/i;
    const selfReferentialEn = /\bYoppo\s+companion\b/i;
    if (selfReferentialFr.test(line) || selfReferentialEn.test(line)) {
      assert.ok(
        /YoPratiqo/.test(line),
        `Yoppo must always be paired with YoPratiqo on the same line — offending line: ${line.trim()}`,
      );
    }
  }
});

// ─── 4. Pratiqo is never renamed to YoPratiqo ─────────────────────
test("Pratiqo (platform) is never renamed to YoPratiqo on student-facing surfaces", () => {
  // The cross-product bridge surfaces should still mention "Pratiqo"
  // alone (the platform) at least somewhere — e.g. "Voir toute ma
  // progression Pratiqo" / "View my full Pratiqo progress" — so the
  // cross-product story stays legible.
  const candidates: Array<keyof typeof STUDENT_FACING_FILES> = [
    "courseCompanionPanel",
    "publicCompanionOnboardingCard",
    "studentHubContent",
    "progressPage",
    "studentCompanionCard",
  ];
  let surfacesWithPratiqo = 0;
  for (const key of candidates) {
    // Strip "YoPratiqo" before scanning so the lookup is unambiguous.
    const codeWithoutYoPratiqo = studentCodes[key].replace(/YoPratiqo/g, "");
    if (/\bPratiqo\b/.test(codeWithoutYoPratiqo)) surfacesWithPratiqo += 1;
  }
  assert.ok(
    surfacesWithPratiqo >= 3,
    `at least 3 cross-product surfaces must still mention the bare 'Pratiqo' platform name (got ${surfacesWithPratiqo})`,
  );
});

// ─── 5. 'Yo' alone is never a product name ────────────────────────
test("no student-facing companion surface uses 'Yo' alone as a product name", () => {
  // Token: a "Yo" word boundary NOT preceded by alphanumerics and
  // NOT followed by a letter (so "Yoppo" / "YoPratiqo" /
  // "YoLocaleSwitcher" / etc. are all excluded). The two "ok" cases
  // we EXCLUDE explicitly: (a) the Quebec-French oral marker "Y'o",
  // (b) `Yo!` Spanish-style first-person which would never appear
  // in shipped UI copy here. If a future contributor sneaks in
  // "Welcome to Yo!" or "Yo · companion" we want the test red.
  for (const [key, code] of Object.entries(studentCodes)) {
    const standalone = code.match(
      /(?<![A-Za-z0-9_-])Yo(?![A-Za-z])(?!\s*Pratiqo)/g,
    );
    assert.ok(
      standalone === null,
      `${key} must never use 'Yo' alone as a product name (offending: ${
        standalone?.slice(0, 3).join(", ") ?? ""
      })`,
    );
  }
});

// ─── 6. Teacher-facing copy stays professional (no mascot takeover)
test("teacher-facing copy keeps the professional 'YoPratiqo summary shared by the student' framing", () => {
  // The canonical title in `teacherBridgeCopy.ts` must remain the
  // professional phrasing the brief mandates — Yoppo is for the
  // student-facing companion UX, NOT the teacher dashboard.
  const teacherCopySrc = teacherSrcs.teacherBridgeCopy;
  assert.match(
    teacherCopySrc,
    /Résumé YoPratiqo partagé par l['’]élève/,
    "teacherBridgeCopy.ts must keep the FR 'Résumé YoPratiqo partagé par l'élève' wording",
  );
  assert.match(
    teacherCopySrc,
    /YoPratiqo summary shared by the student/,
    "teacherBridgeCopy.ts must keep the EN 'YoPratiqo summary shared by the student' wording",
  );
  assert.match(
    teacherCopySrc,
    /Resumen (?:de )?YoPratiqo compartido por el estudiante/,
    "teacherBridgeCopy.ts must keep the ES 'Resumen (de )YoPratiqo compartido por el estudiante' wording",
  );
});

// ─── 7. Teacher-facing surfaces stay mascot-free ──────────────────
test("teacher-facing copy never adopts the mascot-like 'Yoppo' label", () => {
  // Both the teacher insight card and the teacherBridgeCopy file
  // must remain mascot-free. Yoppo is specifically called out in
  // the brief as student-facing only.
  for (const [key, code] of Object.entries(teacherCodes)) {
    assert.ok(
      !/\bYoppo\b/.test(code),
      `${key} (${TEACHER_FACING_FILES[key as keyof typeof TEACHER_FACING_FILES]}) must NOT use the mascot 'Yoppo' label — teacher copy stays professional`,
    );
  }
});

// ─── 8. Paid YoPratiqo checkout remains disabled ──────────────────
test("paid YoPratiqo checkout remains disabled (mascot rename does not unlock pay UX)", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(configSrc, /premiumModulesEnabled:\s*false/);
});

// ─── 9. No restricted systems touched on any companion surface ────
test("no companion surface introduces restricted-system imports", () => {
  const forbidden = [
    /from\s+["']stripe["']/i,
    /from\s+["']@\/lib\/stripe/i,
    /from\s+["']@\/lib\/payments/i,
    /from\s+["']@\/lib\/tax/i,
    /from\s+["']@\/lib\/membrePro/i,
    /from\s+["']openai["']/i,
    /from\s+["']@\/scripts\//i,
    /service[_-]?role/i,
  ];
  for (const [key, src] of Object.entries({
    ...studentSrcs,
    ...teacherSrcs,
  })) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(src),
        `${key} must not import ${re.source}`,
      );
    }
  }
});

// ─── 10. No raw quiz fields introduced on any companion surface ───
test("no companion surface introduces raw quiz answer payloads", () => {
  const RAW_QUIZ = [
    /\brawQuiz\b/,
    /\bquizAnswers\b/,
    /\bselectedOptionId\b/,
    /\bsubmittedAnswer\b/,
    /\buserAnswer\b/,
    /\bcorrectOptionId\b/,
    /\bkeystrokeHistory\b/,
  ];
  for (const [key, src] of Object.entries({
    ...studentSrcs,
    ...teacherSrcs,
  })) {
    for (const re of RAW_QUIZ) {
      assert.ok(
        !re.test(src),
        `${key} must not ship a raw quiz field matching ${re.source}`,
      );
    }
  }
});

// ─── Run ──────────────────────────────────────────────────────────
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
  console.log(`[yo:companion-yoppo-naming] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
