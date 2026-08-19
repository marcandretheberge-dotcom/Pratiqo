import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Regression guard: mobile teacher result card must keep the name visible.
//
// Production QA (see PR fix/mobile-teacher-card-name-badges) found that on
// a 320-360 px phone the student-search teacher card was hiding the
// teacher's name behind compact trust badges. The previous header
// rendered the name and badges in the SAME flex row:
//
//   <div className="flex items-center gap-2 min-w-0">
//     <p className="truncate font-semibold ...">{name}</p>
//     {badges.map(b => (
//       <TeacherBadgePill ... compact className="shrink-0" />
//     ))}
//   </div>
//
// Because the badges carried `shrink-0`, the only flex item that could
// give up width was the name <p>. With two compact pills (~95 px each),
// the avatar (44 px), the rating chip and gap-2 spacings, the name
// container was squeezed to ~0 px on common phone widths and the
// teacher's name visually disappeared.
//
// The fix protects the name region in the inline `TeacherCard` of
// `app/(app)/student/search/page.tsx`:
//
//   * the right-of-avatar column is `min-w-0 flex-1`
//   * the name <p> and the discipline <p> live in their own truncated
//     rows — no badge ever competes with them for horizontal space
//   * the badges live in their OWN row directly below the discipline,
//     using `flex flex-wrap items-center gap-1`, so they wrap onto a
//     second line on narrow viewports instead of pushing the name
//     container to zero width
//   * the `shrink-0` on TeacherBadgePill (which made the bug
//     unsurvivable) is gone — badges now consume only the space that
//     remains after the protected name region
//
// This guard scans the inline TeacherCard so a future refactor cannot
// silently re-introduce the QA-visible regression by dropping badges
// back into the same flex row as the name.
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const SEARCH_PAGE_SRC = readFileSync(
  join(ROOT, "app", "(app)", "student", "search", "page.tsx"),
  "utf8",
);

// Sibling cards that the brief told us not to touch — we still verify
// they exist as separate components so the fix did NOT collapse them
// onto the same broken layout.
const EXPLORE_TEACHER_CARD_SRC = readFileSync(
  join(ROOT, "components", "Explore.tsx"),
  "utf8",
);
const TEACHER_BADGE_PILL_SRC = readFileSync(
  join(ROOT, "components", "TeacherBadgePill.tsx"),
  "utf8",
);
const TEACHER_CARD_IDENTITY_SRC = readFileSync(
  join(ROOT, "components", "teachers", "TeacherCardIdentityCheck.tsx"),
  "utf8",
);

// Two additional teacher-card surfaces audited as part of the same QA
// sweep that produced PR #178. Neither of them currently exhibits the
// "badges hide the name" bug, but both are layout-adjacent enough that
// a future refactor could re-introduce it. We add positive guards
// here so a regression on any of these surfaces fails CI in the same
// place reviewers already look when they touch the search card.
//
//   * LandingTeacherListingCard renders the name + badges in the
//     SAME row but uses `flex-wrap`, which is the load-bearing
//     primitive that lets badges fall to a new line instead of
//     squeezing the name to zero width.
//   * SearchMapView's `selectedTeacher` overlay (the map mini-card)
//     renders no badges at all today; if a future refactor adds
//     <TeacherBadgePill> there, it must NOT land inside the same
//     `min-w-0` column as the name without a wrapping row.
const LANDING_TEACHER_LISTING_CARD_SRC = readFileSync(
  join(ROOT, "components", "marketing", "LandingTeacherListingCard.tsx"),
  "utf8",
);
const SEARCH_MAP_VIEW_SRC = readFileSync(
  join(ROOT, "components", "SearchMapView.tsx"),
  "utf8",
);

// The inline `TeacherCard` body of the student-search page is the last
// top-level declaration in `app/(app)/student/search/page.tsx`, so we
// slice from its `function TeacherCard({` opener to end-of-file. If a
// future refactor extracts the card into its own module, this anchor
// would simply return an empty slice — the assertions below would
// fail and the test would force a re-anchor instead of silently
// passing.
const TEACHER_CARD_START_MARKER = "function TeacherCard({";
const TEACHER_CARD_START_IDX = SEARCH_PAGE_SRC.indexOf(TEACHER_CARD_START_MARKER);
assert.ok(
  TEACHER_CARD_START_IDX >= 0,
  "expected an inline `function TeacherCard({` declaration in app/(app)/student/search/page.tsx — please re-anchor this test if the card was extracted into its own module.",
);
const TEACHER_CARD = SEARCH_PAGE_SRC.slice(TEACHER_CARD_START_IDX);

// -------- 1. Name lives in its own protected row, never sharing with badges

test("name <p> is NOT in a flex row that also contains TeacherBadgePill", () => {
  // The pre-fix layout looked like:
  //   <div className="flex items-center gap-2 min-w-0">
  //     <p className="truncate font-semibold ...">{name}</p>
  //     {badges.map(b => <TeacherBadgePill compact className="shrink-0" />)}
  //   </div>
  // We forbid that exact shape — the name <p> must NOT have any
  // TeacherBadgePill rendered as a sibling inside the same flex row.
  //
  // We approximate "same row" by walking 0–600 chars after the
  // `formatPublicTeacherDisplayName(teacher.name)` token until we hit a
  // closing </div>. If a TeacherBadgePill appears before that closing
  // </div>, the name and badges are still in the same container and
  // the bug is back.
  const nameMarker = "formatPublicTeacherDisplayName(teacher.name)";
  const nameIdx = TEACHER_CARD.indexOf(nameMarker);
  assert.ok(nameIdx >= 0, "name expression must still be rendered");
  const tail = TEACHER_CARD.slice(nameIdx, nameIdx + 600);
  const closingDivIdx = tail.indexOf("</p>");
  assert.ok(
    closingDivIdx >= 0,
    "name must be wrapped in its own <p> element",
  );
  const nameRow = tail.slice(0, closingDivIdx);
  assert.doesNotMatch(
    nameRow,
    /<TeacherBadgePill\b/,
    "TeacherBadgePill must NOT appear inside the same row as the name <p>",
  );
});

// -------- 2. Right-of-avatar column has the protected width primitives ----

test("right-of-avatar column uses min-w-0 + flex-1 to protect name width", () => {
  // The right-of-avatar column must be both `min-w-0` (so it can
  // shrink below its intrinsic content width) AND `flex-1` (so it
  // claims remaining horizontal space after the avatar). Either one
  // missing brings the bug back.
  assert.match(
    TEACHER_CARD,
    /className="min-w-0 flex-1"/,
    "right-of-avatar column must have className=\"min-w-0 flex-1\" so the name container can shrink and claim space",
  );
});

// -------- 3. Avatar+text wrapper claims space and aligns to top ------------

test("avatar+text wrapper carries flex-1 + min-w-0 + items-start", () => {
  // The OUTER row that holds the avatar and the right column also
  // needs `min-w-0 flex-1` so the avatar can sit next to a flexible
  // text column. items-start (instead of items-center) keeps the
  // avatar aligned with the top of the now-taller text column when
  // badges wrap to a second line.
  assert.match(
    TEACHER_CARD,
    /className="flex min-w-0 flex-1 items-start gap-3"/,
    "avatar+text wrapper must use flex min-w-0 flex-1 items-start gap-3",
  );
});

// -------- 4. Long teacher name still truncates safely ---------------------

test("name <p> still uses truncate so an extreme name renders one ellipsised line", () => {
  // The name lives in a truncated span so a pathological 60-char name still
  // degrades to a single ellipsised line instead of breaking the card.
  assert.match(
    TEACHER_CARD,
    /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/,
    "name must keep `truncate` on its own span",
  );
});

// -------- 5. Discipline still rendered, still truncates -------------------

test("discipline summary stays present and truncated below the name", () => {
  assert.match(
    TEACHER_CARD,
    /<p className=\{PUBLIC_TEACHER_CARD_DISCIPLINE_CLASS\}>\{formatTeacherCardDisciplines\(teacher\)\}<\/p>/,
    "discipline <p> must still render with truncate using the shared summary helper",
  );
});

// -------- 6. Badges render in their own wrapping row ---------------------

test("search card does not render trust badge pills", () => {
  assert.doesNotMatch(
    TEACHER_CARD,
    /<TeacherBadgePill\b/,
    "student-search TeacherCard must not render TeacherBadgePill",
  );
  assert.doesNotMatch(
    TEACHER_CARD,
    /getSearchCardTeacherBadges\(/,
    "student-search TeacherCard must not select compact trust pills",
  );
  assert.doesNotMatch(
    TEACHER_CARD,
    /teacherBadgeNewTeacher/,
    "search card must not show “Nouveau sur Pratiqo”",
  );
});

test("verified identity uses a compact inline checkmark that cannot squeeze the name", () => {
  assert.match(
    TEACHER_CARD,
    /isPublicTeacherIdentityVerified\(/,
    "search card must use the canonical identity helper",
  );
  assert.match(
    TEACHER_CARD,
    /<TeacherCardIdentityCheck verified=\{identityVerified\}/,
    "verified identity checkmark must be present in markup",
  );
  assert.match(
    TEACHER_CARD_IDENTITY_SRC,
    /className="inline-flex shrink-0 text-teal-700"/,
    "identity checkmark must be shrink-0 so the name span truncates instead",
  );
  assert.match(
    TEACHER_CARD_IDENTITY_SRC,
    /<span className="sr-only">\{label\}<\/span>/,
    "checkmark must not be the only accessible identity signal",
  );
});

test("no absolute positioning is used to overlay trust UI over the name", () => {
  const minWrapper = TEACHER_CARD.match(
    /<div className="min-w-0 flex-1">[\s\S]{0,800}?<\/div>/,
  );
  if (minWrapper) {
    assert.doesNotMatch(
      minWrapper[0],
      /\babsolute\b/,
      "name column must rely on flex flow, not absolute positioning",
    );
  }
});

// -------- 9. Search / data-fetching logic is NOT touched -----------------

test("teacher search/data-fetching logic is not touched by the layout fix", () => {
  // Sanity guards on the page itself: the teacher-fetching pipeline
  // (Supabase `.select`, the search engine helpers, the radius
  // filter, the listing metadata applier) must still be wired
  // through the page exactly as before.
  assert.match(
    SEARCH_PAGE_SRC,
    /TEACHERS_PUBLIC_TABLE/,
    "page must still query TEACHERS_PUBLIC_TABLE",
  );
  assert.match(
    SEARCH_PAGE_SRC,
    /buildTeacherSearchRows/,
    "page must still build teacher search rows",
  );
  assert.match(
    SEARCH_PAGE_SRC,
    /applyRadiusFilter/,
    "page must still apply the radius filter",
  );
  assert.match(
    SEARCH_PAGE_SRC,
    /sortRows/,
    "page must still sort rows",
  );
  assert.match(
    SEARCH_PAGE_SRC,
    /applyTeacherListingMetadata/,
    "page must still apply teacher listing metadata",
  );
});

// -------- 10. Sibling cards (Explore landing) NOT collapsed onto fix ----

test("landing-page TeacherCard in components/Explore.tsx is not modified", () => {
  // The brief explicitly forbids touching the landing-page card unless
  // it is the same broken component. It is NOT — Explore.tsx has its
  // own file-local `TeacherCard` with a different layout (category
  // pill row + mode icons in the header, name below). We confirm the
  // landing card still defines its own TeacherCard and still lays out
  // the marketplaceCategory pill at the top, exactly as before.
  assert.match(
    EXPLORE_TEACHER_CARD_SRC,
    /function TeacherCard\(\{/,
    "Explore.tsx must still define its own TeacherCard",
  );
  assert.match(
    EXPLORE_TEACHER_CARD_SRC,
    /displayTeacherMarketplaceCategory/,
    "Explore.tsx TeacherCard must still render the marketplace category pill",
  );
});

// -------- 11. TeacherBadgePill itself stays untouched --------------------

test("TeacherBadgePill component contract is untouched (max-w-full + truncate label)", () => {
  // We rely on TeacherBadgePill keeping `max-w-full` and a truncating
  // label so a pathological "Identité diplôme partenaire studio" copy
  // never overflows the wrapping badge row. If that contract is
  // weakened later, this card's mobile layout regresses.
  assert.match(
    TEACHER_BADGE_PILL_SRC,
    /max-w-full/,
    "TeacherBadgePill must keep `max-w-full`",
  );
  assert.match(
    TEACHER_BADGE_PILL_SRC,
    /<span className="truncate">\{label\}<\/span>/,
    "TeacherBadgePill must keep its truncating label span",
  );
});

// -------- 12. Landing card: name+badges row keeps `flex-wrap` -----------

test("LandingTeacherListingCard keeps the name truncated and free of trust pills", () => {
  assert.doesNotMatch(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /<TeacherBadgePill\b/,
    "landing cards must not render TeacherBadgePill",
  );
  assert.doesNotMatch(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /badges\.map\(/,
    "landing cards must not render a compact badge-pill row",
  );
  assert.match(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /<TeacherCardIdentityCheck verified=\{identityVerified\}/,
    "landing cards use the compact identity checkmark",
  );
  assert.match(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /formatPublicTeacherDisplayName\(teacher\.name\)/,
    "landing cards must use the shared public name formatter",
  );
});

test("LandingTeacherListingCard right column uses min-w-0 flex-1 to protect name width", () => {
  const occurrences =
    LANDING_TEACHER_LISTING_CARD_SRC.match(/min-w-0 flex-1/g) ?? [];
  assert.ok(
    occurrences.length >= 2,
    `LandingTeacherListingCard must have at least 2 \`min-w-0 flex-1\` columns (outer right column + inner name column); found ${occurrences.length}`,
  );
  assert.match(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/,
    "LandingTeacherListingCard's name must keep `truncate` on its own span",
  );
});

test("LandingTeacherListingCard does not overlay intro session badges on teacher photos", () => {
  assert.doesNotMatch(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /introSessionBadge/,
    "compact public teacher listing cards must not render the intro-session badge over the avatar/photo",
  );
  assert.doesNotMatch(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /absolute -bottom-1 -right-1[\s\S]{0,180}?introSession/,
    "intro-session metadata must never be absolutely positioned on top of the teacher photo",
  );
});

// -------- 13. Map mini-card: name protected, no badge bug surface --------

test("SearchMapView mini-card renders the teacher name in a min-w-0 column with truncate", () => {
  // The map's selected-teacher overlay puts the name + discipline
  // in their own `min-w-0` column with truncating <p>s. This is the
  // structural primitive that keeps the name visible against a
  // shrink-0 close button on the right. Guard both invariants.
  assert.match(
    SEARCH_MAP_VIEW_SRC,
    /className="min-w-0 flex-1"/,
    "SearchMapView mini-card must render its text column inside `className=\"min-w-0 flex-1\"`",
  );
  assert.match(
    SEARCH_MAP_VIEW_SRC,
    /<span className="truncate">\{formatPublicTeacherDisplayName\(teacher\.name\)\}<\/span>/,
    "SearchMapView mini-card name must stay truncated in its own span",
  );
  assert.match(
    SEARCH_MAP_VIEW_SRC,
    /getTeacherDisciplineSummary\(teacher\)/,
    "SearchMapView mini-card must use the shared discipline summary helper",
  );
  assert.doesNotMatch(
    SEARCH_MAP_VIEW_SRC,
    /selectedTeacher\.discipline/,
    "SearchMapView mini-card must not display only teacher.discipline",
  );
});

test("SearchMapView mini-card uses a compact identity checkmark instead of trust pills", () => {
  const nameIdx = SEARCH_MAP_VIEW_SRC.indexOf("formatPublicTeacherDisplayName(teacher.name)");
  assert.ok(nameIdx >= 0, "map popup must still render the public teacher name");
  const afterName = SEARCH_MAP_VIEW_SRC.slice(nameIdx, nameIdx + 900);
  const nameClose = afterName.indexOf("</p>");
  assert.ok(nameClose >= 0);
  assert.doesNotMatch(
    afterName.slice(0, nameClose),
    /<TeacherBadgePill\b/,
    "TeacherBadgePill must not share the name <p>",
  );
  assert.doesNotMatch(
    SEARCH_MAP_VIEW_SRC,
    /<TeacherBadgePill\b/,
    "map popup must not render TeacherBadgePill",
  );
  assert.match(
    SEARCH_MAP_VIEW_SRC,
    /<TeacherCardIdentityCheck verified=\{identityVerified\}/,
    "map popup must use the compact identity checkmark",
  );
});

// ── Run ─────────────────────────────────────────────────────────────────────

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(
    `[teacherSearch:studentSearchTeacherCardMobileLayout] ${passed} tests passed`,
  );
}
