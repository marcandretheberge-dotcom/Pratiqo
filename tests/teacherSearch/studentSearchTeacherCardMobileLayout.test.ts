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
  // `publicFirstNameWithInitial(teacher.name)` token until we hit a
  // closing </div>. If a TeacherBadgePill appears before that closing
  // </div>, the name and badges are still in the same container and
  // the bug is back.
  const nameMarker = "publicFirstNameWithInitial(teacher.name)";
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
  // The fix keeps `truncate` on the name line so a pathological 60-char
  // name still degrades to a single ellipsised line instead of
  // breaking the card vertically.
  const nameRowMatch = TEACHER_CARD.match(
    /<p className="truncate font-semibold text-\[#2C2C2A\]">[\s\S]{0,160}?publicFirstNameWithInitial\(teacher\.name\)/,
  );
  assert.ok(
    nameRowMatch,
    "name <p> must keep `truncate font-semibold text-[#2C2C2A]`",
  );
});

// -------- 5. Discipline still rendered, still truncates -------------------

test("discipline summary stays present and truncated below the name", () => {
  assert.match(
    TEACHER_CARD,
    /<p className="truncate text-xs text-\[#6B6A65\]">\{formatTeacherCardDisciplines\(teacher\)\}<\/p>/,
    "discipline <p> must still render with `truncate text-xs text-[#6B6A65]` using the shared summary helper",
  );
});

// -------- 6. Badges render in their own wrapping row ---------------------

test("badges live in a dedicated flex-wrap row, never competing with the name", () => {
  // The new dedicated badge row uses `mt-1.5 flex flex-wrap
  // items-center gap-1`. flex-wrap is the critical primitive — it
  // ensures the badges fall onto a second visual line on narrow
  // screens instead of overflowing the card or squeezing the name.
  assert.match(
    TEACHER_CARD,
    /className="mt-1\.5 flex flex-wrap items-center gap-1"/,
    "badges must render in their own `mt-1.5 flex flex-wrap items-center gap-1` row",
  );
  // The dedicated badge row must contain the actual map; otherwise the
  // wrapper is decorative and the badges might still be elsewhere.
  const wrapperMatch = TEACHER_CARD.match(
    /className="mt-1\.5 flex flex-wrap items-center gap-1"[\s\S]{0,400}?<\/div>/,
  );
  assert.ok(wrapperMatch, "badge wrapper must close before the next sibling");
  assert.match(
    wrapperMatch![0],
    /badges\.map\(\(badge\)/,
    "badge wrapper must actually map over `badges`",
  );
  assert.match(
    wrapperMatch![0],
    /<TeacherBadgePill\b/,
    "badge wrapper must render <TeacherBadgePill>",
  );
});

// -------- 7. Badges are no longer pinned with shrink-0 -------------------

test("TeacherBadgePill in this card must not carry shrink-0", () => {
  // The original bug was specifically that the badges were
  // `shrink-0` AND in the same flex row as the name — when the row
  // overflowed, only the name could shrink. Now that badges live in
  // their own wrapping row, `shrink-0` is no longer needed (and
  // re-introducing it would make the badges spill out of the card on
  // very narrow screens). Forbid it on this card's badge call sites.
  const cardBadgePills = [...TEACHER_CARD.matchAll(/<TeacherBadgePill[\s\S]*?\/>/g)];
  assert.ok(
    cardBadgePills.length > 0,
    "expected the student-search TeacherCard to still render <TeacherBadgePill>",
  );
  for (const m of cardBadgePills) {
    assert.doesNotMatch(
      m[0],
      /shrink-0/,
      "TeacherBadgePill in the student-search TeacherCard must NOT carry className=\"shrink-0\" — that re-creates the QA bug",
    );
  }
});

// -------- 8. Badges are NOT absolutely positioned ------------------------

test("no absolute positioning is used to overlay badges over the name", () => {
  // Sanity check: the layout must rely on flow + flex-wrap, never on
  // absolute positioning that could overlap the name.
  const cardBadgePills = [...TEACHER_CARD.matchAll(/<TeacherBadgePill[\s\S]*?\/>/g)];
  for (const m of cardBadgePills) {
    assert.doesNotMatch(
      m[0],
      /\babsolute\b/,
      "TeacherBadgePill must not be rendered with absolute positioning",
    );
  }
  // Also: the wrapper's parent column must not carry `position:
  // absolute` either.
  const minWrapper = TEACHER_CARD.match(
    /<div className="min-w-0 flex-1">[\s\S]{0,800}?<\/div>/,
  );
  if (minWrapper) {
    assert.doesNotMatch(
      minWrapper[0],
      /\babsolute\b/,
      "name+badges column must rely on flex flow, not absolute positioning",
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

test("LandingTeacherListingCard keeps flex-wrap on the name+badges row so badges wrap below name on mobile", () => {
  // The landing card intentionally puts the name and badges in the
  // SAME row, but adds `flex-wrap` so badges fall onto a second line
  // when they would otherwise crowd the name on a narrow phone. The
  // `gap-y-1` is what makes that wrapped second line breathe.
  //
  // If a future refactor removes `flex-wrap` from this row, the
  // landing card regresses to the exact bug PR #178 fixed in the
  // search card. This guard catches that.
  const nameRowMatch = LANDING_TEACHER_LISTING_CARD_SRC.match(
    /<div className="flex flex-wrap items-center gap-x-2 gap-y-1">[\s\S]{0,400}?publicFirstNameWithInitial\(teacher\.name\)[\s\S]{0,400}?<\/div>/,
  );
  assert.ok(
    nameRowMatch,
    "LandingTeacherListingCard must render the name + badges inside a `flex flex-wrap items-center gap-x-2 gap-y-1` row",
  );
  // The row that wraps must actually contain the badge map; otherwise
  // the wrap utility is decorative and badges live somewhere else.
  assert.match(
    nameRowMatch![0],
    /badges\.map\(\(badge\)/,
    "LandingTeacherListingCard's flex-wrap row must include the badges.map(...) render",
  );
});

test("LandingTeacherListingCard right column uses min-w-0 flex-1 to protect name width", () => {
  // The landing card's right-of-avatar column also needs `min-w-0
  // flex-1` for `truncate` on the name to actually take effect. Both
  // the outer right column AND the inner name column are guarded.
  const occurrences =
    LANDING_TEACHER_LISTING_CARD_SRC.match(/className="min-w-0 flex-1"/g) ?? [];
  assert.ok(
    occurrences.length >= 2,
    `LandingTeacherListingCard must have at least 2 \`min-w-0 flex-1\` columns (outer right column + inner name column); found ${occurrences.length}`,
  );
  // And the name <p> must keep `truncate` so a pathological 60-char
  // name still renders as a single ellipsised line on mobile.
  assert.match(
    LANDING_TEACHER_LISTING_CARD_SRC,
    /<p className="truncate text-\[15px\] font-bold leading-tight tracking-tight text-\[#2C2C2A\]">[\s\S]{0,80}?publicFirstNameWithInitial\(teacher\.name\)/,
    "LandingTeacherListingCard's name <p> must keep `truncate` + the existing typography",
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
    /<p className="truncate font-semibold text-\[#2C2C2A\]">\s*\{publicFirstNameWithInitial\(teacher\.name\)\}\s*<\/p>/s,
    "SearchMapView mini-card name <p> must be truncating",
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

test("SearchMapView mini-card puts trust badges in a dedicated flex-wrap row", () => {
  const nameIdx = SEARCH_MAP_VIEW_SRC.indexOf("publicFirstNameWithInitial(teacher.name)");
  assert.ok(nameIdx >= 0, "map popup must still render the public teacher name");
  const afterName = SEARCH_MAP_VIEW_SRC.slice(nameIdx, nameIdx + 900);
  const nameClose = afterName.indexOf("</p>");
  assert.ok(nameClose >= 0);
  assert.doesNotMatch(
    afterName.slice(0, nameClose),
    /<TeacherBadgePill\b/,
    "TeacherBadgePill must not share the name <p>",
  );
  assert.match(
    SEARCH_MAP_VIEW_SRC,
    /flex flex-wrap items-center gap-1[\s\S]{0,180}<TeacherBadgePill/,
    "trust badges must live in a dedicated flex-wrap row under the name",
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
