import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sanitizeContactInfo } from "@/lib/messaging/sanitizeContactInfo";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PLACEHOLDERS = {
  fr: "[masqué — info de contact]",
  en: "[hidden — contact info]",
  es: "[oculto — datos de contacto]",
} as const;

const RAW_EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const RAW_NA_PHONE_RE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

// -------- Email -------------------------------------------------------------

test("email is masked before the first completed lesson (fr)", () => {
  const input = "Contact moi à sophie.martin@example.com pour les détails";
  const out = sanitizeContactInfo(input, "fr", false);

  assert.equal(out.masked, true);
  assert.deepEqual(out.reasons, ["email"]);
  assert.equal(
    out.content,
    `Contact moi à ${PLACEHOLDERS.fr} pour les détails`,
  );
  assert.doesNotMatch(out.content, RAW_EMAIL_RE, "raw email must not survive masking");
});

test("email mask uses the en placeholder in English locale", () => {
  const out = sanitizeContactInfo("write me at sam@example.com", "en", false);
  assert.equal(out.masked, true);
  assert.ok(out.content.includes(PLACEHOLDERS.en));
  assert.ok(!out.content.includes(PLACEHOLDERS.fr));
});

test("email mask uses the es placeholder in Spanish locale", () => {
  const out = sanitizeContactInfo("escribime a alex@ejemplo.com", "es", false);
  assert.equal(out.masked, true);
  assert.ok(out.content.includes(PLACEHOLDERS.es));
});

// -------- North-American phone ---------------------------------------------

test("NANP phone (514-555-0199) is masked before first completed lesson", () => {
  const out = sanitizeContactInfo("appelle-moi au 514-555-0199 stp", "fr", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_na"));
  assert.doesNotMatch(out.content, RAW_NA_PHONE_RE);
});

test("NANP phone with parentheses ((514) 555-0199) is masked", () => {
  const out = sanitizeContactInfo("(514) 555-0199 fonctionne pour moi", "fr", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_na"));
});

test("NANP phone with +1 prefix is masked", () => {
  const out = sanitizeContactInfo("+1 514 555 0199 if needed", "en", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_na"));
});

// -------- International phone ----------------------------------------------

test("international phone (+33 …) is masked", () => {
  const out = sanitizeContactInfo("essaye le +33 6 12 34 56 78", "fr", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("phone_intl"));
  // Defensive: no run of 5+ consecutive digits leaks through.
  assert.doesNotMatch(out.content, /\d{5,}/);
});

// -------- Channel keywords -------------------------------------------------

test("'whatsapp' channel keyword is masked", () => {
  const out = sanitizeContactInfo("on peut passer sur whatsapp ?", "fr", false);
  assert.equal(out.masked, true);
  assert.deepEqual(out.reasons, ["channel_keyword"]);
  assert.equal(out.content, `on peut passer sur ${PLACEHOLDERS.fr} ?`);
});

test("'interac' / 'e-transfer' money keywords are masked", () => {
  const out = sanitizeContactInfo("je peux te payer par interac ou e-transfer", "fr", false);
  assert.equal(out.masked, true);
  // Both 'interac' and 'e-transfer' fall under the same reason bucket.
  assert.deepEqual(out.reasons, ["channel_keyword"]);
  assert.ok(!/interac/i.test(out.content));
  assert.ok(!/e[-\s]?transfer/i.test(out.content));
});

test("'Telegram' is masked case-insensitively", () => {
  const out = sanitizeContactInfo("I'm on Telegram", "en", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("channel_keyword"));
});

// -------- Social handles ---------------------------------------------------

test("@social handle is masked", () => {
  const out = sanitizeContactInfo("trouve-moi @elena.dance là-bas", "fr", false);
  assert.equal(out.masked, true);
  assert.ok(out.reasons.includes("social_handle"));
  assert.ok(!out.content.includes("@elena.dance"));
});

// -------- Normal logistical text should pass through -----------------------

test("normal lesson message stays unchanged", () => {
  const input = "Parfait, à demain 17h au studio. J'apporte la guitare classique.";
  const out = sanitizeContactInfo(input, "fr", false);

  assert.equal(out.masked, false);
  assert.deepEqual(out.reasons, []);
  assert.equal(out.content, input);
});

test("Montreal postal code (H2L 1L4) is not flagged as a phone", () => {
  const input = "Studio is at 123 rue Saint-Denis, H2L 1L4";
  const out = sanitizeContactInfo(input, "en", false);
  assert.equal(out.masked, false, `unexpectedly masked: ${JSON.stringify(out)}`);
});

// -------- Gate open: identity ---------------------------------------------

test("gateOpen = true leaves content unchanged even with contact info", () => {
  const input = "Reach me at sophie@example.com or +1 514 555 0199";
  const out = sanitizeContactInfo(input, "fr", true);
  assert.equal(out.masked, false);
  assert.deepEqual(out.reasons, []);
  assert.equal(out.content, input);
});

// -------- Defense in depth -------------------------------------------------

test("masked output never contains the raw email or phone", () => {
  const input =
    "ping me at sam@example.com or 514-555-0199 or +33 6 12 34 56 78 — also wsapp/telegram/snapchat";
  const out = sanitizeContactInfo(input, "en", false);

  assert.equal(out.masked, true);
  assert.doesNotMatch(out.content, RAW_EMAIL_RE);
  assert.doesNotMatch(out.content, RAW_NA_PHONE_RE);
  // No run of 5+ digits (international number remnants) survives.
  assert.doesNotMatch(out.content, /\d{5,}/);
  assert.ok(!/telegram/i.test(out.content));
  assert.ok(!/snapchat/i.test(out.content));
});

// -------- Bypass-removed assertion (audit guard) ---------------------------
//
// The whole point of this patch is that user-composed messages must hit the
// `/api/messages/send` route so the sanitizer runs server-side. Before this
// change `lib/messaging.ts::sendMessage` did its own
// `supabase.from("messages").insert(...)` from the browser. This assertion
// guards against that regression by source-scanning the file.

test("lib/messaging.ts no longer issues a direct messages insert", () => {
  const src = readFileSync(join(process.cwd(), "lib", "messaging.ts"), "utf8");
  // The `sendMessage` function body must not contain a direct .insert(...)
  // on the messages table. (The fetchMessagesForUser/markAsRead etc. use
  // .select/.update — those are fine.)
  const sendMessageBlock = src.match(/export async function sendMessage[\s\S]*?\n}\s/);
  assert.ok(sendMessageBlock, "could not locate sendMessage function in lib/messaging.ts");
  const block = sendMessageBlock![0];
  assert.ok(
    !/\.from\(\s*["']messages["']\s*\)\s*\.insert/.test(block),
    "sendMessage must POST to /api/messages/send, not insert directly via supabase client",
  );
  assert.ok(
    /fetch\(\s*["']\/api\/messages\/send["']/.test(block),
    "sendMessage must call /api/messages/send",
  );
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[messaging:sanitizeContactInfo] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
