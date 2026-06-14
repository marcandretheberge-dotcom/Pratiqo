import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Regression guard: booking date / hour slot availability colours.
//
// Production QA reported that available slots in the student booking flow
// looked unavailable: the previous styling rendered the available state
// with `border-slate-200 hover:border-teal-500/40` and no background fill,
// which read as "disabled" next to the muted `bg-slate-50 text-slate-300`
// disabled state — both states ended up looking grey.
//
// This patch keeps a clear three-state contract on both date cards and
// hour-slot buttons inside `components/BookingModal.tsx`:
//
//   • disabled (past or full)  → muted slate, non-interactive
//                                  border-slate-200 / bg-slate-100 /
//                                  text-slate-400 / cursor-not-allowed
//   • available (clickable)    → light teal, clearly clickable
//                                  border-teal-300 / bg-teal-50 /
//                                  text-teal-800 / hover:bg-teal-100
//   • selected (active pick)   → solid deep teal, white text
//                                  border-teal-700 / bg-teal-700 /
//                                  text-white / hover:bg-teal-800
//
// The booking AVAILABILITY business logic (`cell.disabled =
// iso <= todayIso || count === 0`, the slots loader, etc.) is *not*
// changed — this guard scans the modal source so a future refactor
// cannot silently re-introduce the QA-visible regression by collapsing
// the available + disabled visuals onto the same neutral chip.
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const MODAL_SRC = readFileSync(
  join(ROOT, "components", "BookingModal.tsx"),
  "utf8",
);

// ── Helper: extract a slice of the source by anchor strings ────────────────
function sliceBetween(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, `start marker not found: ${startMarker}`);
  const end = src.indexOf(endMarker, start);
  assert.ok(end > start, `end marker not found after start: ${endMarker}`);
  return src.slice(start, end);
}

// Sections we scan separately so a regression in one slot type cannot be
// hidden by a coincidentally-correct string somewhere else in the file.
//
// Date-card section:   from `{calendarCells.map((cell)` until the
//                      `{step === "pickSlot"` block opens.
// Slot-button section: from `{g.items.map((s)` until the back-button
//                      `setStep("pickDate")` handler that lives outside
//                      the slot grid (the only stable, unique downstream
//                      marker in the current file).
const DATE_CARD_SECTION = sliceBetween(
  MODAL_SRC,
  "{calendarCells.map((cell)",
  "{step === \"pickSlot\"",
);
const SLOT_BUTTON_SECTION = sliceBetween(
  MODAL_SRC,
  "{g.items.map((s)",
  "setStep(\"pickDate\")",
);

// -------- 1. Booking-availability business logic is untouched --------------

test("availability calculation still uses iso<=todayIso || count===0", () => {
  // The single source of truth for "is this date disabled" must remain
  // the same expression — UI styling tweaks must never change the
  // disability inputs.
  assert.match(
    MODAL_SRC,
    /const\s+disabled\s*=\s*iso\s*<=\s*todayIso\s*\|\|\s*count\s*===\s*0\s*;/,
    "calendarCells must still derive disabled from `iso <= todayIso || count === 0`",
  );
});

// -------- 2. Disabled date card looks muted-grey, not interactive ----------

test("unavailable date card uses muted slate visuals + cursor-not-allowed", () => {
  // Disabled state must use a slate palette (grey/muted) and signal
  // non-interactivity. The previous `bg-slate-50 text-slate-300
  // opacity-60` combo rendered double-faded; the new slate-100 + slate-400
  // pair is grey but legible.
  assert.match(
    DATE_CARD_SECTION,
    /cell\.disabled[\s\S]*?border-slate-200/,
    "disabled date card must keep a slate-200 border",
  );
  assert.match(
    DATE_CARD_SECTION,
    /cell\.disabled[\s\S]*?bg-slate-100/,
    "disabled date card must use bg-slate-100 (muted grey, never the same green-tinted background as available)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /cell\.disabled[\s\S]*?text-slate-400/,
    "disabled date card must use text-slate-400 (visibly muted but legible)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /cell\.disabled[\s\S]*?cursor-not-allowed/,
    "disabled date card must show cursor-not-allowed",
  );
  // The disabled <button> still carries the native `disabled` attribute,
  // which implicitly sets aria-disabled — this is the source of the
  // a11y semantics, not a class.
  assert.match(
    DATE_CARD_SECTION,
    /disabled=\{cell\.disabled\}/,
    "disabled date card must still pass disabled={cell.disabled} to the button",
  );
});

// -------- 3. Available date card is visually green and clickable ----------

test("available date card uses light-teal fill + dark-teal text + cursor-pointer", () => {
  // Critical regression guard: the prior `border-slate-200
  // hover:border-teal-500/50` pair shipped no green tint, so available
  // and disabled looked indistinguishable. The available state must now
  // use a clearly-green palette.
  assert.match(
    DATE_CARD_SECTION,
    /border-teal-300/,
    "available date card must use border-teal-300 (clearly green border)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /bg-teal-50/,
    "available date card must use bg-teal-50 (light-green fill, never neutral)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /text-teal-800/,
    "available date card must use text-teal-800 (dark-green text, high contrast on bg-teal-50)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /hover:bg-teal-100/,
    "available date card must brighten on hover (hover:bg-teal-100)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /cursor-pointer/,
    "available date card must keep cursor-pointer so it is clearly clickable",
  );
  // Banned: the previous available state used only `border-slate-200`
  // with no fill, which was the QA-reported regression.
  assert.doesNotMatch(
    DATE_CARD_SECTION,
    /:\s*"border-slate-200 hover:border-teal-500\/50"/,
    "available date card must NOT regress to the bare border-slate-200 + hover-only outline",
  );
});

// -------- 4. Selected date card is visually deep-green / active ----------

test("selected date card uses solid deep-teal background + white text", () => {
  assert.match(
    DATE_CARD_SECTION,
    /isSelected[\s\S]*?border-teal-700/,
    "selected date card must use border-teal-700",
  );
  assert.match(
    DATE_CARD_SECTION,
    /isSelected[\s\S]*?bg-teal-700/,
    "selected date card must use bg-teal-700 (solid deep teal, dominant over available's bg-teal-50)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /isSelected[\s\S]*?text-white/,
    "selected date card must use text-white (high contrast on bg-teal-700)",
  );
  assert.match(
    DATE_CARD_SECTION,
    /aria-pressed=\{isSelected\}/,
    "selected date card must expose aria-pressed for screen-reader semantics",
  );
});

// -------- 5. Date card data-attribute exposes the tri-state ----------

test("date card stamps data-availability-state for QA + scraping", () => {
  // A stable data attribute lets the manual QA team and any future
  // visual-diff tooling assert the rendered state without coupling to
  // Tailwind class strings.
  assert.match(
    DATE_CARD_SECTION,
    /data-availability-state=\{[\s\S]*?cell\.disabled[\s\S]*?"unavailable"[\s\S]*?isSelected[\s\S]*?"selected"[\s\S]*?"available"/,
    "date card must stamp data-availability-state with unavailable/selected/available",
  );
});

// -------- 6. Disabled hour slot leverages :disabled pseudo-class ----------

test("hour slot button keeps a disabled visual fallback (slate, non-clickable)", () => {
  // The slot list is currently API-pre-filtered to "available" only, so
  // no slot is ever disabled today. We still ship `:disabled` styling so
  // a future "past slot today" surface can re-use the same button
  // without duplicating the muted palette elsewhere.
  assert.match(
    SLOT_BUTTON_SECTION,
    /disabled:cursor-not-allowed/,
    "hour slot button must include a disabled:cursor-not-allowed visual",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /disabled:bg-slate-100/,
    "hour slot button must include a disabled:bg-slate-100 visual",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /disabled:text-slate-400/,
    "hour slot button must include a disabled:text-slate-400 visual",
  );
});

// -------- 7. Available hour slot is clearly green + clickable ----------

test("available hour slot uses light-teal fill + dark-teal text + cursor-pointer", () => {
  assert.match(
    SLOT_BUTTON_SECTION,
    /border-teal-300/,
    "available hour slot must use border-teal-300",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /bg-teal-50/,
    "available hour slot must use bg-teal-50 (light-green fill)",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /text-teal-800/,
    "available hour slot must use text-teal-800 (dark-green text)",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /hover:bg-teal-100/,
    "available hour slot must brighten on hover",
  );
  assert.doesNotMatch(
    SLOT_BUTTON_SECTION,
    /:\s*"border-slate-200 hover:border-teal-500\/40"/,
    "available hour slot must NOT regress to the bare border-slate-200 + hover-only outline",
  );
});

// -------- 8. Selected hour slot is visually deep-green / active ----------

test("selected hour slot uses solid deep-teal background + white text", () => {
  assert.match(
    SLOT_BUTTON_SECTION,
    /isSelected[\s\S]*?border-teal-700/,
    "selected hour slot must use border-teal-700",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /isSelected[\s\S]*?bg-teal-700/,
    "selected hour slot must use bg-teal-700 (solid deep teal)",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /isSelected[\s\S]*?text-white/,
    "selected hour slot must use text-white",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /aria-pressed=\{isSelected\}/,
    "selected hour slot must expose aria-pressed for screen-reader semantics",
  );
});

// -------- 9. Available + selected states stay clearly distinct -------------

test("selected card visual is dominant over available card visual", () => {
  // bg-teal-50 (available) and bg-teal-700 (selected) sit at opposite
  // ends of the teal scale — the contrast is intentional and is what
  // makes a picked date / picked time read as "active" on a busy
  // calendar grid. If a future refactor accidentally collapses them
  // (e.g. selected → bg-teal-100), this guard fires.
  assert.match(DATE_CARD_SECTION, /bg-teal-50/);
  assert.match(DATE_CARD_SECTION, /bg-teal-700/);
  assert.match(SLOT_BUTTON_SECTION, /bg-teal-50/);
  assert.match(SLOT_BUTTON_SECTION, /bg-teal-700/);
});

// -------- 10. Focus ring is preserved on both surfaces ---------------------

test("date card and hour slot keep a visible focus ring", () => {
  assert.match(
    DATE_CARD_SECTION,
    /focus-visible:ring-2/,
    "date card must keep a focus-visible:ring-2 ring (keyboard a11y)",
  );
  assert.match(
    SLOT_BUTTON_SECTION,
    /focus-visible:ring-2/,
    "hour slot must keep a focus-visible:ring-2 ring (keyboard a11y)",
  );
});

// -------- 11. Booking submission, payment, cancellation logic is untouched -

test("booking submission and payment surfaces are not touched by the colour fix", () => {
  // This PR is UI-only. The submit handler that POSTs the booking
  // request must still exist verbatim, and the colour fix must not have
  // leaked any new payments / Stripe imports into the modal. The
  // pre-existing cancellation-client import is intentional and is left
  // alone — the brief forbids changing cancellation *logic*, not
  // importing the existing helper.
  assert.match(
    MODAL_SRC,
    /\/api\/bookings/,
    "BookingModal must still POST to /api/bookings",
  );
  assert.doesNotMatch(
    MODAL_SRC,
    /from\s+["']stripe["']/i,
    "BookingModal must not import the Stripe server SDK",
  );
  assert.doesNotMatch(
    MODAL_SRC,
    /from\s+["']@stripe\/stripe-js/i,
    "BookingModal must not import the @stripe/stripe-js client SDK",
  );
  assert.doesNotMatch(
    MODAL_SRC,
    /from\s+["']@\/lib\/payments\//i,
    "BookingModal must not pull in lib/payments/* during a UI fix",
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
    `[bookings:bookingSlotAvailabilityColors] ${passed} tests passed`,
  );
}
