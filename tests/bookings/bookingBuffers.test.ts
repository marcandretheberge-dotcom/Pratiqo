import assert from "node:assert/strict";
import {
  type BookedSlotInterval,
  type DayAvailability,
  expandBookingInterval,
  generateSlots,
  intervalsOverlap,
  slotStartMinutes,
} from "@/lib/slots";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const FULL_DAY: DayAvailability = { matin: true, apresmidi: true, soir: true };
const EMPTY_BLOCKED_PERIODS: string[] = [];
const EMPTY_BLOCKED_RANGES: { start: number; end: number }[] = [];

function intervalFromSlot(slot: string, durationMin: number): BookedSlotInterval {
  return { startMin: slotStartMinutes(slot), durationMin };
}

// --- Pure helpers -----------------------------------------------------------

test("expandBookingInterval clamps negative buffers and zero duration", () => {
  const i = expandBookingInterval(60, 60, -10, -5);
  assert.deepEqual(i, { startMin: 60, endMin: 120 });
  const j = expandBookingInterval(60, 0, 15, 15);
  // Duration clamps to 1 to avoid collapsing the interval.
  assert.equal(j.startMin, 45);
  assert.equal(j.endMin, 60 + 1 + 15);
  const k = expandBookingInterval(5, 60, 60, 0);
  // Lower bound never goes below 0 (midnight).
  assert.equal(k.startMin, 0);
  assert.equal(k.endMin, 65);
});

test("intervalsOverlap is half-open and rejects touching boundaries", () => {
  assert.equal(intervalsOverlap({ startMin: 0, endMin: 60 }, { startMin: 60, endMin: 120 }), false);
  assert.equal(intervalsOverlap({ startMin: 0, endMin: 60 }, { startMin: 59, endMin: 61 }), true);
  assert.equal(intervalsOverlap({ startMin: 100, endMin: 200 }, { startMin: 0, endMin: 50 }), false);
});

// --- generateSlots: 0-buffer regression -------------------------------------

test("0 buffer preserves existing behavior (string-match path)", () => {
  // Existing booking at 8h00 (60 min). With both buffers 0 the legacy code
  // path simply excludes the exact "8h00" label and emits everything else
  // on the duration grid: 8h00 (skipped), 9h00, 10h00, 11h00.
  const slotsLegacy = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    ["8h00"],
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
  );
  const slotsExplicitZero = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    ["8h00"],
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [intervalFromSlot("8h00", 60)],
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  );
  assert.deepEqual(slotsLegacy, slotsExplicitZero);
  // matin (8-12), apresmidi (12-17), soir (17-21) → expect 8h00 missing.
  assert.equal(slotsLegacy.includes("8h00"), false);
  assert.equal(slotsLegacy.includes("9h00"), true);
});

// --- after-only 15 min ------------------------------------------------------

test("after-only 15 min allows 9h00 (boundary touch) is rejected at expanded 9h00→10h00", () => {
  // Existing 8h00–9h00 expanded with after=15 → [8h00, 9h15].
  // Candidate at 9h00 expanded → [9h00, 10h00]. Overlap exists (9h00 < 9h15).
  // So the next emitted candidate that actually survives is 10h00.
  const slots = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    ["8h00"],
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [intervalFromSlot("8h00", 60)],
      bufferBeforeMin: 0,
      bufferAfterMin: 15,
    },
  );
  assert.equal(slots.includes("9h00"), false);
  assert.equal(slots.includes("10h00"), true);
});

test("after-only 15 min allows an off-grid 9h15 candidate (algorithm-level)", () => {
  // The generator walks in duration steps and won't emit 9h15. Validate the
  // algorithm directly: a 9h15–10h15 candidate must NOT overlap an
  // 8h00–9h00 existing booking when only after=15 is set.
  const before = 0;
  const after = 15;
  const existing = expandBookingInterval(slotStartMinutes("8h00"), 60, before, after);
  const candidate = expandBookingInterval(slotStartMinutes("9h15"), 60, before, after);
  assert.equal(intervalsOverlap(candidate, existing), false);
});

// --- before+after 15 min ---------------------------------------------------

test("before+after 15 blocks 9h15 candidate and allows 9h30 (algorithm-level)", () => {
  const before = 15;
  const after = 15;
  const existing = expandBookingInterval(slotStartMinutes("8h00"), 60, before, after); // [7h45, 9h15]
  const cand915 = expandBookingInterval(slotStartMinutes("9h15"), 60, before, after); // [9h00, 10h30]
  const cand930 = expandBookingInterval(slotStartMinutes("9h30"), 60, before, after); // [9h15, 10h45]
  assert.equal(intervalsOverlap(cand915, existing), true);
  assert.equal(intervalsOverlap(cand930, existing), false);
});

test("before+after 15 with 60-min grid: 9h00 still rejected, next 10h00 accepted", () => {
  const slots = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    ["8h00"],
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [intervalFromSlot("8h00", 60)],
      bufferBeforeMin: 15,
      bufferAfterMin: 15,
    },
  );
  assert.equal(slots.includes("9h00"), false);
  assert.equal(slots.includes("10h00"), true);
});

// --- Status filtering happens upstream; here we verify that whatever the
// caller passes through gets honored. --------------------------------------

test("only pending_payment/confirmed bookings should be present in bookedIntervals", () => {
  // Caller (fetchBookedSlotsByDate) already filters out cancelled / completed
  // statuses with .in("status", ["pending_payment", "confirmed"]). To prove
  // the buffer path respects this, simulate: when the caller correctly omits
  // cancelled bookings from bookedIntervals AND bookedSlots, the slot is
  // emitted as if nothing was there.
  const cancelledExisting = intervalFromSlot("8h00", 60);
  void cancelledExisting; // intentionally NOT passed into generateSlots
  const slots = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    [], // caller filtered out the cancelled booking's label
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [], // and its interval
      bufferBeforeMin: 15,
      bufferAfterMin: 15,
    },
  );
  assert.equal(slots[0], "8h00");
});

test("pending_payment and confirmed bookings both block via bookedIntervals", () => {
  // Either status row makes it into bookedIntervals from fetchBookedSlotsByDate
  // — both should block the matching grid candidate.
  const slotsWithPending = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    ["8h00"],
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [intervalFromSlot("8h00", 60)],
      bufferBeforeMin: 0,
      bufferAfterMin: 30,
    },
  );
  assert.equal(slotsWithPending.includes("8h00"), false);
  assert.equal(slotsWithPending.includes("9h00"), false); // 9h00 conflicts with expanded [8h00, 9h30]
  assert.equal(slotsWithPending.includes("10h00"), true);
});

// --- Different durations ---------------------------------------------------

test("different durations respect interval overlap (existing 30-min vs candidate 60-min)", () => {
  // Existing 10h00–10h30 (30 min) with after=15 → expanded [10h00, 10h45].
  // Candidate 10h30 (60 min) expanded → [10h30, 11h45]. Overlap.
  const before = 0;
  const after = 15;
  const existing = expandBookingInterval(slotStartMinutes("10h00"), 30, before, after);
  const candidate = expandBookingInterval(slotStartMinutes("10h30"), 60, before, after);
  assert.equal(intervalsOverlap(candidate, existing), true);

  // A candidate at 11h00 (60 min) would be [11h00, 12h15] vs [10h00, 10h45] — no overlap.
  const candidateLater = expandBookingInterval(slotStartMinutes("11h00"), 60, before, after);
  assert.equal(intervalsOverlap(candidateLater, existing), false);
});

test("generateSlots respects existing duration from bookedIntervals", () => {
  // Existing booking is 30 min at 10h00 (so [10h00, 10h30] raw).
  // With after=15: expanded existing → [10h00, 10h45].
  // Candidate grid (duration=60): walks at 8h00, 9h00, 10h00, 11h00.
  // Each is tested with expanded [start, start+60+15]:
  //   10h00 → [10h00, 11h15] overlaps [10h00, 10h45] → rejected.
  //   11h00 → [11h00, 12h15] no overlap → accepted.
  const slots = generateSlots(
    FULL_DAY,
    60,
    "2026-06-01",
    [], // 10h00 label is unique to 30-min booking, leave string-match empty for clarity
    EMPTY_BLOCKED_PERIODS,
    EMPTY_BLOCKED_RANGES,
    {
      bookedIntervals: [{ startMin: slotStartMinutes("10h00"), durationMin: 30 }],
      bufferBeforeMin: 0,
      bufferAfterMin: 15,
    },
  );
  assert.equal(slots.includes("10h00"), false);
  assert.equal(slots.includes("11h00"), true);
});

// --- Checkout-style overlap check (algorithm parity) -----------------------

test("checkout rejects a candidate that overlaps via expanded buffers (409 algorithm parity)", () => {
  // Mirror the checkout route's check: same teacher, same day, candidate
  // overlap detected by expandBookingInterval + intervalsOverlap.
  const before = 15;
  const after = 15;
  const existingCandidates: BookedSlotInterval[] = [
    { startMin: slotStartMinutes("8h00"), durationMin: 60 },
    { startMin: slotStartMinutes("14h00"), durationMin: 60 },
  ];
  const candidateStartMin = slotStartMinutes("9h00"); // would be expanded [8h45, 10h15]
  const candidateDurMin = 60;
  const candidate = expandBookingInterval(candidateStartMin, candidateDurMin, before, after);

  let rejected = false;
  for (const ex of existingCandidates) {
    const exp = expandBookingInterval(ex.startMin, ex.durationMin, before, after);
    if (intervalsOverlap(candidate, exp)) {
      rejected = true;
      break;
    }
  }
  assert.equal(rejected, true);

  // Move candidate far away → must NOT be rejected.
  const safe = expandBookingInterval(slotStartMinutes("11h00"), candidateDurMin, before, after);
  let stillRejected = false;
  for (const ex of existingCandidates) {
    const exp = expandBookingInterval(ex.startMin, ex.durationMin, before, after);
    if (intervalsOverlap(safe, exp)) {
      stillRejected = true;
      break;
    }
  }
  assert.equal(stillRejected, false);
});

// --- Run --------------------------------------------------------------------

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:bookingBuffers] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
