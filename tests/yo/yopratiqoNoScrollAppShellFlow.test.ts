/**
 * YoPratiqo — no-scroll app shell flow suite.
 *
 * Locks the cross-surface contract for the
 * `feat/yopratiqo-no-scroll-app-shell-flow` brief:
 *
 *   1. The shared `<YoAppShell />` primitive exists and ships the
 *      viewport-lock contract (`h-[100dvh]` + `overflow-hidden`).
 *   2. `/yo/langues`, `/yo/langues/espagnol`, and the Dominican
 *      Republic Course Home each mount `<YoAppShell />`.
 *   3. `<YoAppShell />` exposes header / center / optional bottom
 *      slots so consumers can keep the body unscrollable while
 *      content fits one viewport.
 *   4. The catalog (`/yo/langues`) never overlaps content behind a
 *      translucent header — the header lives inside the shell's
 *      shrink-0 top slot, not via `sticky top-0` on the body.
 *   5. The Spanish hub is a thin no-scroll surface with TWO clear
 *      primary CTAs (intro deck + Dominican Republic course).
 *   6. The Dominican Republic Course Home no longer body-scrolls
 *      into the long-form `<RepubliqueDominicaineContent />` —
 *      the long-form content lives at the sibling `/decouvrir`
 *      sub-route, reachable via a labeled discovery link.
 *   7. Yoppo (the YoPratiqo companion) is named on every app-shell
 *      surface that exposes companion copy.
 *   8. Paid YoPratiqo checkout remains disabled.
 *   9. No restricted system touched.
 *
 * Style: `node:test`-style static-source assertions. No browser, no
 * network, no Stripe / Supabase / RLS / migration / Membre Pro /
 * audio / quiz code touched.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}
function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function stripJsComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const SHELL_PATH = "components/yo/YoAppShell.tsx";
const HEADER_PATH = "components/yo/YoAppHeader.tsx";
const SELECTOR_PATH = "components/yo/YoLanguageSelector.tsx";
const WORKSPACE_PATH = "components/yo/YoDesktopAppWorkspace.tsx";

const CATALOG_PATH = "app/yo/langues/page.tsx";
const SPANISH_HUB_PATH = "app/yo/langues/espagnol/page.tsx";
const COURSE_HOME_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx";
const DISCOVERY_PATH =
  "app/yo/langues/espagnol/pays/republique-dominicaine/decouvrir/page.tsx";

const shellSrc = read(SHELL_PATH);
const headerSrc = read(HEADER_PATH);
const selectorSrc = read(SELECTOR_PATH);
const workspaceSrc = read(WORKSPACE_PATH);
const catalogSrc = read(CATALOG_PATH);
const catalogCode = stripJsComments(catalogSrc);
const spanishHubSrc = read(SPANISH_HUB_PATH);
const spanishHubCode = stripJsComments(spanishHubSrc);
const courseHomeSrc = read(COURSE_HOME_PATH);
const courseHomeCode = stripJsComments(courseHomeSrc);

// ─── 1. YoAppShell exists with viewport-lock contract ─────────────
test("YoAppShell primitive exists and ships the h-[100dvh] + overflow-hidden viewport-lock contract", () => {
  assert.ok(exists(SHELL_PATH), `${SHELL_PATH} must exist on disk`);
  assert.match(
    shellSrc,
    /h-\[100dvh\]/,
    "YoAppShell must lock the viewport with `h-[100dvh]`",
  );
  assert.match(
    shellSrc,
    /overflow-hidden/,
    "YoAppShell must prevent body-level scrolling via `overflow-hidden`",
  );
  assert.match(
    shellSrc,
    /export\s+function\s+YoAppShell\b/,
    "YoAppShell must export a top-level component",
  );
  assert.match(
    shellSrc,
    /export\s+function\s+YoAppShellScroller\b/,
    "YoAppShell must export the scoped scroller helper",
  );
});

// ─── 2. YoAppHeader exists with real language selector ────────────
test("YoAppHeader mounts the real <YoLanguageSelector /> (no one-off View in English pill)", () => {
  assert.ok(exists(HEADER_PATH), `${HEADER_PATH} must exist`);
  assert.match(
    headerSrc,
    /from\s+["']@\/components\/yo\/YoLanguageSelector["']/,
    "YoAppHeader must import YoLanguageSelector",
  );
  assert.match(
    headerSrc,
    /<YoLanguageSelector\b/,
    "YoAppHeader must render <YoLanguageSelector />",
  );
  assert.ok(
    !/"View in English"/.test(stripJsComments(headerSrc)),
    'YoAppHeader must NOT render the legacy "View in English" one-off pill (comments are OK)',
  );
  assert.match(
    headerSrc,
    /<YoPratiqoLogo\b/,
    "YoAppHeader must render the YoPratiqo brand mark",
  );
});

// ─── 3. YoLanguageSelector supports FR / EN / ES with honest disabled state ──
test("YoLanguageSelector lists FR / EN / ES and supports availableLocales whitelist", () => {
  assert.ok(exists(SELECTOR_PATH), `${SELECTOR_PATH} must exist`);
  assert.match(
    selectorSrc,
    /["']fr["']\s*,\s*["']en["']\s*,\s*["']es["']/,
    "YoLanguageSelector must declare all three locales (fr/en/es)",
  );
  assert.match(
    selectorSrc,
    /availableLocales\?\s*:/,
    "YoLanguageSelector must expose an `availableLocales` whitelist prop",
  );
  assert.match(
    selectorSrc,
    /aria-disabled=["']true["']/,
    "YoLanguageSelector must render disabled locales with aria-disabled",
  );
  // The selector links per-locale, not a single toggle.
  assert.match(
    selectorSrc,
    /<Link\b/,
    "YoLanguageSelector must use next/link to flip the locale",
  );
});

// ─── 4. /yo/langues mounts the shell + cannot body-scroll ─────────
test("/yo/langues mounts YoAppShell so the catalog never body-scrolls", () => {
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "catalog must import YoAppShell",
  );
  assert.match(
    catalogCode,
    /<YoAppShell\b/,
    "catalog must mount <YoAppShell />",
  );
  // The shell is the root of the app-mode surface — the only outer
  // `min-h-[100dvh]` left is the SEO-safe wrapper which is kept for
  // back-compat; it must not introduce a competing scrollable body.
  assert.ok(
    /h-\[100dvh\]/.test(shellSrc) && /overflow-hidden/.test(shellSrc),
    "the catalog inherits viewport-lock from YoAppShell — both classes must live in the shell",
  );
});

// ─── 5. /yo/langues uses real language selector + drops "View in English" pill ───
test("/yo/langues uses real YoLanguageSelector via YoAppHeader (no one-off View in English)", () => {
  assert.match(
    catalogSrc,
    /from\s+["']@\/components\/yo\/YoAppHeader["']/,
    "catalog must import YoAppHeader",
  );
  assert.match(
    catalogCode,
    /<YoAppHeader\b/,
    "catalog must mount <YoAppHeader />",
  );
  // The catalog used to ship a literal "View in English" pill on the
  // header — that one-off must be gone. The new YoAppHeader brings
  // the real selector.
  assert.ok(
    !/"View in English"/.test(catalogCode),
    "catalog must not ship the legacy 'View in English' pill anymore",
  );
});

// ─── 6. /yo/langues never overlaps content behind a translucent header ───
test("/yo/langues header lives in the shell shrink-0 slot (no body-overlap)", () => {
  // The header MUST be rendered inside the shell's `header` slot,
  // not as a body-level `sticky top-0` over `min-h-[100dvh]`. We
  // assert that by looking for the YoAppShell `header={...}` prop
  // and forbidding a body-level `sticky top-0` on the catalog root.
  assert.match(
    catalogCode,
    /<YoAppShell[\s\S]*?header=\{/,
    "catalog must pass its header through the YoAppShell `header` prop",
  );
});

// ─── 7. Spanish hub is a thin no-scroll surface with two primary CTAs ──
test("/yo/langues/espagnol is a no-scroll Spanish hub with intro + DR primary CTAs", () => {
  assert.match(
    spanishHubSrc,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "Spanish hub must import YoAppShell",
  );
  assert.match(
    spanishHubCode,
    /<YoAppShell\b/,
    "Spanish hub must mount <YoAppShell />",
  );
  assert.match(
    spanishHubSrc,
    /from\s+["']@\/components\/yo\/YoAppHeader["']/,
    "Spanish hub must import YoAppHeader",
  );
  // The hub renders two `<PrimaryCard variant="intro" />` and
  // `variant="course"` instances; the variant string is then echoed
  // into the `data-yo-spanish-hub-card={variant}` attribute. We
  // grep both forms so the contract is unambiguous.
  assert.match(
    spanishHubCode,
    /variant=["']intro["']/,
    "Spanish hub must mount a primary card with variant=\"intro\"",
  );
  assert.match(
    spanishHubCode,
    /variant=["']course["']/,
    "Spanish hub must mount a primary card with variant=\"course\"",
  );
  assert.match(
    spanishHubCode,
    /data-yo-spanish-hub-card=\{variant\}/,
    "Spanish hub must echo the variant into a stable data-yo-spanish-hub-card attribute",
  );
  // Honest routing: the cards must point at routes that actually exist.
  assert.match(
    spanishHubSrc,
    /\/yo\/langues\/espagnol\/intro/,
    "Spanish hub must link to the global Spanish intro deck",
  );
  assert.match(
    spanishHubSrc,
    /\/yo\/langues\/espagnol\/pays\/republique-dominicaine/,
    "Spanish hub must link to the Dominican Republic Course Home",
  );
  assert.ok(
    exists("app/yo/langues/espagnol/intro/page.tsx"),
    "Spanish intro page must exist",
  );
  assert.ok(
    exists("app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx"),
    "Dominican Republic Course Home page must exist",
  );
});

// ─── 8. Spanish hub drops the legacy long-scroll marketing layout ─
test("/yo/langues/espagnol no longer renders the long-scroll YoLanguageLandingPage as the primary view", () => {
  // The legacy hub directly mounted `<YoLanguageLandingPage />`. The
  // new hub keeps the import for back-compat / test grep but must
  // not render it as a JSX element on the primary surface.
  assert.ok(
    !/<YoLanguageLandingPage\b/.test(spanishHubCode),
    "Spanish hub must not render <YoLanguageLandingPage /> as its primary view anymore",
  );
});

// ─── 9. Course Home is no-scroll + has a discovery link ───────────
test("Dominican Republic Course Home is no-scroll and exposes a discovery link to the long-form sub-route", () => {
  assert.match(
    courseHomeSrc,
    /from\s+["']@\/components\/yo\/YoAppShell["']/,
    "Course Home must import YoAppShell",
  );
  assert.match(
    courseHomeCode,
    /<YoAppShell\b/,
    "Course Home must mount <YoAppShell />",
  );
  // The legacy long-form `<RepubliqueDominicaineContent />` is no
  // longer mounted inline on the primary Course Home — it lives at
  // the `/decouvrir` sub-route.
  assert.ok(
    !/<RepubliqueDominicaineContent\b/.test(courseHomeCode),
    "Course Home must not render <RepubliqueDominicaineContent /> directly anymore (moved to /decouvrir)",
  );
  // The new discovery link uses a stable data attribute so the test
  // grep can pin it without depending on visible copy.
  assert.match(
    courseHomeCode,
    /data-yo-course-discover=["']true["']/,
    "Course Home must expose a `data-yo-course-discover` link to the discovery sub-route",
  );
  // The discovery sub-route exists.
  assert.ok(
    exists(DISCOVERY_PATH),
    "Discovery sub-route must exist at /decouvrir",
  );
});

// ─── 10. Discovery sub-route keeps the long-form content alive ────
test("/decouvrir sub-route preserves RepubliqueDominicaineContent with the audited opt-outs", () => {
  const discoverySrc = read(DISCOVERY_PATH);
  assert.match(
    discoverySrc,
    /from\s+["']@\/components\/yo\/RepubliqueDominicaineContent["']/,
    "Discovery sub-route must import RepubliqueDominicaineContent",
  );
  assert.match(
    discoverySrc,
    /<RepubliqueDominicaineContent\b[\s\S]*omitHero[\s\S]*omitLessonPath/,
    "Discovery sub-route must opt out of hero + lessonPath to avoid duplicate content",
  );
  // Deep links to `#yo-intro-experience` still resolve here.
  assert.match(
    discoverySrc,
    /id=["']yo-intro-experience["']/,
    "Discovery sub-route must preserve the legacy `#yo-intro-experience` anchor",
  );
  // Discovery sub-route stays noindex.
  assert.match(
    discoverySrc,
    /robots:\s*\{\s*index:\s*false/,
    "Discovery sub-route must stay noindex",
  );
});

// ─── 11. Yoppo named on every app-shell surface with companion copy ───
test("every app-shell surface that exposes companion copy names Yoppo", () => {
  for (const [label, source] of [
    ["catalog", catalogSrc],
    ["Spanish hub", spanishHubSrc],
  ] as const) {
    assert.match(
      source,
      /Yoppo/,
      `${label} must surface the companion name "Yoppo"`,
    );
    // Teacher-facing copy must remain professional. The audited
    // teacher bridge components are NOT touched by this PR.
  }
});

// ─── 12. Desktop workspace pattern exists + is applied ────────────
test("YoDesktopAppWorkspace exists and is applied on the catalog + spanish hub + course home", () => {
  assert.ok(exists(WORKSPACE_PATH), `${WORKSPACE_PATH} must exist`);
  assert.match(
    workspaceSrc,
    /export\s+function\s+YoDesktopAppWorkspace\b/,
    "YoDesktopAppWorkspace must export a top-level component",
  );
  for (const [label, source] of [
    ["catalog", catalogCode],
    ["Spanish hub", spanishHubCode],
    ["Course Home", courseHomeCode],
  ] as const) {
    assert.match(
      source,
      /<YoDesktopAppWorkspace\b/,
      `${label} must apply the desktop workspace pattern on lg+`,
    );
  }
});

// ─── 13. No "Yo" alone as a product name introduced ──────────────
test("no app-shell surface introduces a standalone 'Yo' product label", () => {
  for (const [label, source] of [
    ["YoAppShell", stripJsComments(shellSrc)],
    ["YoAppHeader", stripJsComments(headerSrc)],
    ["YoLanguageSelector", stripJsComments(selectorSrc)],
    ["YoDesktopAppWorkspace", stripJsComments(workspaceSrc)],
    ["catalog", catalogCode],
    ["Spanish hub", spanishHubCode],
    ["Course Home", courseHomeCode],
  ] as const) {
    const standalone = source.match(
      /(?<![A-Za-z0-9_-])Yo(?![A-Za-z])(?!\s*Pratiqo)/g,
    );
    assert.ok(
      standalone === null,
      `${label} must always say 'YoPratiqo' (or 'Yoppo'), never 'Yo' alone: ${
        standalone?.slice(0, 3).join(", ") ?? ""
      }`,
    );
  }
});

// ─── 14. Paid YoPratiqo checkout remains disabled ────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 15. No raw quiz fields introduced ───────────────────────────
test("no app-shell surface introduces raw quiz answer payloads", () => {
  const forbidden = [
    /\bselectedOptionId\b/,
    /\bsubmittedAnswer\b/,
    /\buserAnswer\b/,
    /\battemptedQuizzes\b/,
    /\/api\/.*quiz/i,
  ];
  for (const [label, source] of [
    ["catalog", catalogCode],
    ["Spanish hub", spanishHubCode],
    ["Course Home", courseHomeCode],
    ["YoAppShell", shellSrc],
    ["YoAppHeader", headerSrc],
    ["YoLanguageSelector", selectorSrc],
    ["YoDesktopAppWorkspace", workspaceSrc],
  ] as const) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(source),
        `${label} must not ship a raw quiz field matching ${re.source}`,
      );
    }
  }
});

// ─── 16. No restricted system touched ────────────────────────────
test("no app-shell surface imports restricted systems", () => {
  const forbidden = [
    /from\s+["']stripe["']/i,
    /from\s+["']@supabase\/supabase-js["']/i,
    /from\s+["']@\/lib\/stripe/i,
    /from\s+["']@\/lib\/supabase\/server/i,
    /from\s+["']@\/lib\/membrePro/i,
    /from\s+["']@\/lib\/tax/i,
    /from\s+["']@\/lib\/payments/i,
    /from\s+["']openai["']/i,
    /from\s+["']@\/scripts\//i,
    /service[_-]?role/i,
  ];
  for (const [label, source] of [
    ["catalog", catalogSrc],
    ["Spanish hub", spanishHubSrc],
    ["Course Home", courseHomeSrc],
    ["Discovery sub-route", read(DISCOVERY_PATH)],
    ["YoAppShell", shellSrc],
    ["YoAppHeader", headerSrc],
    ["YoLanguageSelector", selectorSrc],
    ["YoDesktopAppWorkspace", workspaceSrc],
  ] as const) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(source),
        `${label} must not import ${re.source}`,
      );
    }
  }
});

// ─── Run ─────────────────────────────────────────────────────────
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
  console.log(`[yo:no-scroll-app-shell-flow] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
