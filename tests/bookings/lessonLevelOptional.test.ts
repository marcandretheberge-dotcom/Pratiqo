import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Regression guard: lesson level is OPTIONAL in the booking flow.
//
// Before this patch the preferences→continue button in components/BookingModal
// was silently disabled when no level was selected (`disabled={!selectedLevel}`).
// Users would fill the rest of the form, scroll past the level chips, hit
// Continue, and get no feedback — the booking just stopped.
//
// For launch, lesson level is product-decided to be optional:
//   - the UI must keep the level chips visible (useful context for teachers)
//   - the Continue button must NOT be disabled on missing level
//   - the booking insert must keep sending `student_level` (null when absent)
//   - the DB column must accept null
//
// This test source-scans the affected files so a future refactor cannot
// silently re-introduce the gate without breaking CI.
// ---------------------------------------------------------------------------

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
const MODAL_SRC = readFileSync(join(ROOT, "components", "BookingModal.tsx"), "utf8");
const SCHEMA_SRC = readFileSync(
  join(ROOT, "supabase", "migrations", "000_pratiqo_schema.sql"),
  "utf8",
);
const FR = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "fr.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "en.json"), "utf8"));
const ES = JSON.parse(readFileSync(join(ROOT, "lib", "i18n", "locales", "es.json"), "utf8"));

// -------- UI: Continue button is not gated on selectedLevel ----------------

test("preferences→continue button is not disabled on missing selectedLevel", () => {
  // The exact silent-disable pattern that this patch removes.
  assert.ok(
    !/disabled=\{\s*!selectedLevel\s*\}/.test(MODAL_SRC),
    "Continue button must not be `disabled={!selectedLevel}` — that silently blocks booking",
  );
  // And no equivalent boolean-on-state guard.
  assert.ok(
    !/disabled=\{\s*selectedLevel\s*===\s*null\s*\}/.test(MODAL_SRC),
    "Continue button must not be disabled when selectedLevel === null",
  );
});

// -------- UI: level selector chips still rendered --------------------------

test("level selector chips remain visible in the preferences step", () => {
  // The label must still render so teachers get the context when students opt in.
  assert.ok(
    MODAL_SRC.includes('t("bookingYourLevel")'),
    "bookingYourLevel label must still render",
  );
  // The displayLevels map must still render the chip buttons.
  assert.ok(
    /displayLevels\.map\(/.test(MODAL_SRC),
    "displayLevels.map(...) must still render level chips",
  );
  // The optional helper text must be present.
  assert.ok(
    MODAL_SRC.includes('t("bookingLevelOptionalHelp")'),
    "bookingLevelOptionalHelp helper text must render under the level label",
  );
});

// -------- Payload: student_level is still passed through -------------------

test("booking insert payload still passes student_level (so a selected value is preserved)", () => {
  assert.ok(
    /student_level:\s*selectedLevel/.test(MODAL_SRC),
    "bookings.insert payload must keep `student_level: selectedLevel` so selected values are saved",
  );
});

// -------- DB schema: student_level is nullable -----------------------------

test("supabase schema declares bookings.student_level as nullable text", () => {
  // Match the exact column line and assert there is no NOT NULL constraint.
  const match = SCHEMA_SRC.match(/student_level\s+([^,\n]+)/);
  assert.ok(match, "Could not find student_level column in 000_pratiqo_schema.sql");
  const colDef = match![1].toLowerCase();
  assert.ok(colDef.includes("text"), "student_level must be a text column");
  assert.ok(
    !colDef.includes("not null"),
    "student_level must remain nullable (booking flow now sends null when no level is picked)",
  );
});

// -------- Validation UX: address still has anchored inline feedback --------

test("missing address (domicile) surfaces an inline error AND navigates back to preferences", () => {
  // The ref + state + scroll/focus helper must exist so missing address is
  // surfaced at the field instead of failing silently far below.
  assert.ok(
    /addressTextareaRef\s*=\s*useRef/.test(MODAL_SRC),
    "addressTextareaRef must exist to anchor scroll/focus on the address field",
  );
  assert.ok(
    /setAddressError\(/.test(MODAL_SRC),
    "setAddressError must exist to drive the inline error UI",
  );
  assert.ok(
    /focusAddressField\(/.test(MODAL_SRC),
    "focusAddressField helper must be invoked to scroll + focus the address textarea",
  );
  assert.ok(
    /setStep\(\s*["']preferences["']\s*\)/.test(MODAL_SRC),
    "handleConfirmAndPay must navigate back to preferences when address is missing",
  );
});

// -------- i18n: optional-level helper text present in all 3 locales --------

test("bookingLevelOptionalHelp exists in fr/en/es with the agreed copy", () => {
  assert.equal(FR.bookingLevelOptionalHelp, "Optionnel — aide le professeur à mieux préparer le cours.");
  assert.equal(EN.bookingLevelOptionalHelp, "Optional — helps the teacher prepare the lesson.");
  assert.equal(ES.bookingLevelOptionalHelp, "Opcional — ayuda al profesor a preparar la clase.");
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:lessonLevelOptional] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
