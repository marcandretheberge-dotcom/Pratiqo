/**
 * tests/yo/yopratiqoSpanishHubFlagsAndLayout.test.ts
 *
 * Regression guard for two `/yo/langues/espagnol` QA bugs:
 *
 *   1. Wrong flag — the Dominican Republic course card rendered the
 *      generic Spanish-language ("es" → Spain) flag because
 *      `<PrimaryCard>` only ever defaulted to `language="es"` and no
 *      call site overrode it. `YoLanguageBadge` had no country-level
 *      flag concept at all, only language-level. Fixed by adding a
 *      `"do"` (Dominican Republic) id to the shared
 *      `YoLanguageBadgeId` map and wiring it as the `badge` override
 *      on every `variant="course"` `<PrimaryCard>` call.
 *   2. Cramped desktop layout — the desktop sub-tree used a
 *      280px/1fr/300px three-pane workspace (leftRail + center +
 *      rightRail), which squeezed the two primary cards into a
 *      ~470px center track on every desktop breakpoint regardless of
 *      monitor size (the `max-w-6xl` workspace never grows past
 *      1152px, and the fixed-width rails ate more than half of it).
 *      Fixed by dropping `rightRail` (its content now renders inside
 *      `center`) and widening `centerMaxWidth` to `"4xl"`.
 *
 * Style: `node:test`-style static-source assertions. No browser, no
 * network.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const PAGE_PATH = "app/yo/langues/espagnol/page.tsx";
const BADGE_PATH = "components/yo/YoLanguageBadge.tsx";
const pageSrc = read(PAGE_PATH);
const badgeSrc = read(BADGE_PATH);

// ─────────────────────────────────────────────────────────────────────────
// 1. Shared flag mapping has a real Dominican Republic entry
// ─────────────────────────────────────────────────────────────────────────

test("YoLanguageBadge declares a Dominican Republic ('do') flag distinct from Spain ('es')", () => {
  assert.match(
    badgeSrc,
    /YoLanguageBadgeId\s*=\s*"es"\s*\|\s*"fr-ca"\s*\|\s*"en"\s*\|\s*"ja"\s*\|\s*"it"\s*\|\s*"do"/,
    "YoLanguageBadgeId must add 'do' (Dominican Republic) alongside the language ids",
  );
  assert.match(
    badgeSrc,
    /do:\s*FlagDominicanRepublic/,
    "the language-flags map must route 'do' to its own renderer, not the Spain renderer",
  );
  // The Dominican Republic flag's colours (ultramarine blue + red)
  // must be present and distinct from Spain's flag colours.
  assert.match(
    badgeSrc,
    /#002d62/i,
    "Dominican Republic flag must paint its ultramarine blue (#002d62)",
  );
  assert.match(
    badgeSrc,
    /#ce1126/i,
    "Dominican Republic flag must paint its red (#ce1126)",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Global Spanish intro card uses the Spain flag (default, no override)
// ─────────────────────────────────────────────────────────────────────────

test("the global Spanish intro card (variant=\"intro\") never overrides the default Spain flag", () => {
  // PrimaryCard defaults to `language="es"` (Spain) when no `badge`
  // prop is passed. Every `variant="intro"` call site must NOT pass
  // a `badge` override, so it keeps showing Spain.
  const introCalls = pageSrc.match(/<PrimaryCard\b[\s\S]{0,400}?\/>/g) ?? [];
  const introCallsForIntroVariant = introCalls.filter((block) =>
    /variant="intro"/.test(block),
  );
  assert.ok(
    introCallsForIntroVariant.length >= 2,
    `expected at least 2 variant="intro" <PrimaryCard> call sites (desktop + mobile), found ${introCallsForIntroVariant.length}`,
  );
  for (const block of introCallsForIntroVariant) {
    assert.ok(
      !/badge=/.test(block),
      `variant="intro" <PrimaryCard> must not override the default Spain badge: ${block}`,
    );
  }
  // And the default fallback itself must be Spain.
  assert.match(
    pageSrc,
    /badge\s*\?\?\s*\([\s\S]{0,80}<YoLanguageBadge language="es"/,
    "PrimaryCard's default badge fallback must be the Spain flag (language=\"es\")",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Dominican Republic course card uses the Dominican Republic flag
// ─────────────────────────────────────────────────────────────────────────

test("the Dominican Republic course card (variant=\"course\") overrides the badge with the Dominican Republic flag", () => {
  const courseCalls = (
    pageSrc.match(/<PrimaryCard\b[\s\S]{0,500}?\/>/g) ?? []
  ).filter((block) => /variant="course"/.test(block));
  assert.ok(
    courseCalls.length >= 2,
    `expected at least 2 variant="course" <PrimaryCard> call sites (desktop + mobile), found ${courseCalls.length}`,
  );
  for (const block of courseCalls) {
    assert.match(
      block,
      /badge=\{[\s\S]*<YoLanguageBadge language="do"/,
      `variant="course" <PrimaryCard> must override the badge with the Dominican Republic flag (language="do"): ${block}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Desktop card grid keeps a comfortable minimum width contract
// ─────────────────────────────────────────────────────────────────────────

test("the desktop card grid declares a comfortable minimum card width", () => {
  assert.match(
    pageSrc,
    /data-testid="yo-spanish-hub-card-grid"[\s\S]{0,40}className="grid gap-4 sm:grid-cols-2 sm:\[grid-template-columns:repeat\(2,minmax\(260px,1fr\)\)\]/,
    "the primary card grid must guarantee a minmax(260px, 1fr) minimum width per card so text never wraps awkwardly",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Desktop workspace gives the center column room (no rightRail squeeze)
// ─────────────────────────────────────────────────────────────────────────

test("the Spanish hub desktop workspace widens the center column instead of squeezing it with a rightRail", () => {
  assert.match(
    pageSrc,
    /desktop=\{[\s\S]*centerMaxWidth:\s*["']4xl["']/,
    "desktop config must widen centerMaxWidth to 4xl (896px) instead of the default 2xl (672px) prose cap",
  );
  assert.doesNotMatch(
    pageSrc,
    // `rightRail:` followed by a real value (paren/JSX/brace) is a
    // prop assignment; followed by prose (e.g. "rightRail: a
    // 280px..." in an explanatory comment) is not. Scoped this way
    // so the doc comments explaining the removal don't self-trip.
    /rightRail:\s*[(<{]/,
    "desktop config must not declare a rightRail — a 280px/1fr/300px three-pane split squeezed the two primary cards",
  );
  // The secondary "what's next" content that used to live in the
  // rightRail must still exist, just inside the center column.
  assert.match(
    pageSrc,
    /WHATS_NEXT_EYEBROW/,
    "the 'what's next' content must still render (now inside the center column)",
  );
});

// ─────────────────────────────────────────────────────────────────────────
// 6. No horizontal overflow — cards wrap text, never force a fixed width
//    wider than their container
// ─────────────────────────────────────────────────────────────────────────

test("primary card text wraps normally and never forces horizontal overflow", () => {
  // PrimaryCard's title/body must wrap (break-words / leading-relaxed),
  // never `whitespace-nowrap`, and the card itself must never declare
  // a fixed pixel width wider than its grid track.
  assert.match(
    pageSrc,
    /break-words sm:text-lg/,
    "PrimaryCard title must keep break-words so long FR/ES titles wrap instead of overflowing",
  );
  assert.ok(
    !/whitespace-nowrap/.test(pageSrc),
    "no element on the Spanish hub should force whitespace-nowrap (a common horizontal-overflow cause)",
  );
  assert.ok(
    !/\bw-\[\d{3,}px\]/.test(pageSrc),
    "no element on the Spanish hub should declare a hardcoded 3+ digit pixel width that could overflow a narrower container",
  );
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
  console.log(`[yo:spanish-hub-flags-and-layout] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
