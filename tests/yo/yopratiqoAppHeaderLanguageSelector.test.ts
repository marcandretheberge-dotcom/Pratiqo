/**
 * YoPratiqo — app header language selector suite.
 *
 * Locks the FR / EN / ES language-selector contract introduced by
 * the `feat/yopratiqo-no-scroll-app-shell-flow` brief.
 *
 *   1. `<YoLanguageSelector />` exists and ships the three-locale
 *      pill bar (`fr`, `en`, `es`).
 *   2. The selector accepts an `availableLocales` whitelist so a
 *      route with FR/EN-only copy can render ES as disabled
 *      (`aria-disabled`) instead of linking to a broken page.
 *   3. The selector exposes stable test ids for each locale.
 *   4. The selector uses `next/link` for the locale flip — no
 *      `window.location` / `<a>` raw anchors.
 *   5. The selector is mounted by every app-mode header
 *      (`YoAppHeader`, `YoLessonDeckHeader`, `YoCourseAppHeader`)
 *      — replacing every legacy one-off "View in English" pill.
 *   6. Every app-mode surface (catalog, Spanish hub, Course Home,
 *      every language intro deck) renders an app header that ends
 *      up mounting the language selector via the shared chrome.
 *   7. Paid YoPratiqo checkout remains disabled.
 *   8. No restricted systems touched.
 *
 * Style: `node:test`-style static-source assertions, no browser,
 * no network.
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

const SELECTOR_PATH = "components/yo/YoLanguageSelector.tsx";
const APP_HEADER_PATH = "components/yo/YoAppHeader.tsx";
const DECK_HEADER_PATH = "components/yo/YoLessonDeckHeader.tsx";
const COURSE_HEADER_PATH = "components/yo/YoCourseAppHeader.tsx";

const selectorSrc = read(SELECTOR_PATH);
const selectorCode = stripJsComments(selectorSrc);
const appHeaderSrc = read(APP_HEADER_PATH);
const deckHeaderSrc = read(DECK_HEADER_PATH);
const courseHeaderSrc = read(COURSE_HEADER_PATH);

// ─── 0. Adaptive variants — pill-bar (mobile) + desktop-dropdown ──
test("<YoLanguageSelector /> ships both the pill-bar and desktop-dropdown variants", () => {
  assert.match(
    selectorCode,
    /variant\?\s*:\s*["']pill-bar["']\s*\|\s*["']desktop-dropdown["']/,
    "YoLanguageSelector must declare both pill-bar and desktop-dropdown variants",
  );
  assert.match(
    selectorCode,
    /data-yo-language-selector-variant=["']pill-bar["']/,
    "the pill-bar variant must emit a stable data attribute",
  );
  assert.match(
    selectorCode,
    /data-yo-language-selector-variant=["']desktop-dropdown["']/,
    "the desktop-dropdown variant must emit a stable data attribute",
  );
});

// ─── 0b. YoAppHeader carries an adaptive `appearance` API ─────────
test("<YoAppHeader /> exposes a mobile / desktop / auto appearance API and mounts the matching variant", () => {
  assert.match(
    appHeaderSrc,
    /appearance\?\s*:\s*["']mobile["']\s*\|\s*["']desktop["']\s*\|\s*["']auto["']/,
    "YoAppHeader must expose appearance: mobile | desktop | auto",
  );
  const stripped = stripJsComments(appHeaderSrc);
  for (const re of [
    /data-yo-app-header-appearance=["']mobile["']/,
    /data-yo-app-header-appearance=["']desktop["']/,
    /variant=["']desktop-dropdown["']/,
  ]) {
    assert.match(
      stripped,
      re,
      `YoAppHeader must emit ${re.source}`,
    );
  }
});

// ─── 1. Selector exists with three-locale pill bar ───────────────
test("<YoLanguageSelector /> exists and exposes the three-locale pill bar (fr/en/es)", () => {
  assert.ok(exists(SELECTOR_PATH), `${SELECTOR_PATH} must exist on disk`);
  assert.match(
    selectorSrc,
    /export\s+function\s+YoLanguageSelector\b/,
    "YoLanguageSelector must be exported",
  );
  assert.match(
    selectorCode,
    /["']fr["']\s*,\s*["']en["']\s*,\s*["']es["']/,
    "YoLanguageSelector must declare all three locales (fr/en/es)",
  );
  // "use client" — needed for usePathname().
  assert.match(
    selectorSrc,
    /^["']use client["']/m,
    "YoLanguageSelector must be a client component (needs usePathname)",
  );
});

// ─── 2. availableLocales whitelist + honest disabled state ───────
test("<YoLanguageSelector /> supports availableLocales and renders disabled locales as aria-disabled", () => {
  assert.match(
    selectorSrc,
    /availableLocales\?\s*:/,
    "YoLanguageSelector must expose an `availableLocales` prop",
  );
  assert.match(
    selectorCode,
    /aria-disabled=["']true["']/,
    "YoLanguageSelector must render disabled locales with aria-disabled",
  );
  assert.match(
    selectorCode,
    /data-testid=["']yo-language-selector-disabled-pill["']/,
    "YoLanguageSelector must expose disabled locales via a stable data-testid",
  );
});

// ─── 3. Stable test ids per state ────────────────────────────────
test("<YoLanguageSelector /> ships stable data-testids for active / linked / disabled pills", () => {
  for (const id of [
    /data-testid=["']yo-language-selector["']/,
    /data-testid=["']yo-language-selector-active-pill["']/,
    /data-testid=["']yo-language-selector-pill["']/,
    /data-testid=["']yo-language-selector-disabled-pill["']/,
    /data-yo-language-selector-locale=/,
  ]) {
    assert.match(selectorCode, id, `selector must expose ${id.source}`);
  }
});

// ─── 4. next/link based, never a raw anchor ──────────────────────
test("<YoLanguageSelector /> uses next/link for the locale flip", () => {
  assert.match(
    selectorSrc,
    /import\s+Link\s+from\s+["']next\/link["']/,
    "YoLanguageSelector must import Link from next/link",
  );
  assert.match(
    selectorCode,
    /<Link\b/,
    "YoLanguageSelector must render Next links",
  );
  // No raw window.location hijacks.
  assert.ok(
    !/window\.location/.test(selectorCode),
    "YoLanguageSelector must not navigate via window.location",
  );
});

// ─── 5. Mounted by every app-mode header ─────────────────────────
test("every app-mode header mounts <YoLanguageSelector /> (no one-off View in English)", () => {
  for (const [label, source] of [
    ["YoAppHeader", appHeaderSrc],
    ["YoLessonDeckHeader", deckHeaderSrc],
    ["YoCourseAppHeader", courseHeaderSrc],
  ] as const) {
    assert.match(
      source,
      /from\s+["']@\/components\/yo\/YoLanguageSelector["']/,
      `${label} must import YoLanguageSelector`,
    );
    assert.match(
      source,
      /<YoLanguageSelector\b/,
      `${label} must mount <YoLanguageSelector />`,
    );
    // Strip JSDoc comments before checking for the legacy pill — the
    // comments may legitimately mention the old behaviour.
    const stripped = stripJsComments(source);
    assert.ok(
      !/"View in English"/.test(stripped) && !/"Voir en français"/.test(stripped),
      `${label} must not render the legacy "View in English" / "Voir en français" pill`,
    );
  }
});

// ─── 6. Every app-mode surface reaches the selector via the chrome ──
test("every app-mode surface reaches the language selector via the shared chrome", () => {
  // Each app-mode page reaches the selector by mounting one of:
  //   <YoAppHeader />, <YoCourseAppHeader />, <YoLessonDeck />,
  //   or one of the audited deck-wrapper composers that mount a
  //   <YoLessonDeck /> internally (e.g. <DominicanRepublicIntroContent />).
  const DECK_COMPOSER_NAMES = [
    "YoAppHeader",
    "YoCourseAppHeader",
    "YoLessonDeck",
    "DominicanRepublicIntroContent",
  ];
  for (const path of [
    "app/yo/langues/page.tsx",
    "app/yo/langues/espagnol/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx",
    "app/yo/langues/espagnol/intro/page.tsx",
    "app/yo/langues/francais-quebec/intro/page.tsx",
    "app/yo/langues/italien/intro/page.tsx",
    "app/yo/langues/japonais/intro/page.tsx",
    "app/yo/langues/anglais/intro/page.tsx",
    "app/yo/langues/espagnol/pays/republique-dominicaine/intro/page.tsx",
  ]) {
    assert.ok(exists(path), `${path} must exist on disk`);
    const src = read(path);
    const code = stripJsComments(src);
    const mountsOne = DECK_COMPOSER_NAMES.some((name) =>
      new RegExp(`<${name}\\b`).test(code),
    );
    assert.ok(
      mountsOne,
      `${path} must mount one of [${DECK_COMPOSER_NAMES.join(", ")}] so it inherits the language selector`,
    );
  }
  // Also assert the deck-composer back-stop itself: any wrapper we
  // accept above must, in turn, mount <YoLessonDeck />.
  for (const wrapper of ["components/yo/DominicanRepublicIntroContent.tsx"]) {
    assert.match(
      read(wrapper),
      /<YoLessonDeck\b/,
      `${wrapper} must mount <YoLessonDeck /> so it inherits the language selector`,
    );
  }
});

// ─── 7. Paid YoPratiqo checkout remains disabled ─────────────────
test("paid YoPratiqo checkout remains disabled in yopratiqoProductConfig.ts", () => {
  const configSrc = read("lib/yo/yopratiqoProductConfig.ts");
  assert.match(
    configSrc,
    /premiumModulesEnabled:\s*false/,
    "paid YoPratiqo checkout must stay disabled",
  );
});

// ─── 8. No restricted systems touched ────────────────────────────
test("language-selector + every app-mode header import no restricted systems", () => {
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
    ["YoLanguageSelector", selectorSrc],
    ["YoAppHeader", appHeaderSrc],
    ["YoLessonDeckHeader", deckHeaderSrc],
    ["YoCourseAppHeader", courseHeaderSrc],
  ] as const) {
    for (const re of forbidden) {
      assert.ok(
        !re.test(source),
        `${label} must not import ${re.source}`,
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
  console.log(
    `[yo:app-header-language-selector] ${tests.length} tests passed`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
