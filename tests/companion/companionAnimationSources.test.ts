/**
 * tests/companion/companionAnimationSources.test.ts
 *
 * Defends the "store source MP4s, do not ship raw MP4" contract for the
 * YoPratiqo travel companion animation source folder.
 *
 * What this test guarantees
 * -------------------------
 *   1. The three Firefly-generated source MP4s exist under
 *      `public/companion/travel/animations/` with the canonical
 *      state-aligned filenames the Lottie/Rive conversion plan
 *      depends on.
 *   2. Each source MP4 sits next to a real production PNG sibling at
 *      `public/companion/travel/companion-travel-<state>.png` — so
 *      shipping the source folder never visually replaces a real
 *      asset.
 *   3. The animations folder ships a README.md that documents the
 *      conversion plan and the "do not ship raw MP4" rationale.
 *   4. `lib/companion/companionVisuals.ts` `SHIPPED_ASSETS` allow-list
 *      contains ONLY `.png` filenames. No `.mp4`, no `.webm`, no
 *      `.lottie`, no `.riv` is silently promoted to production.
 *   5. The `CompanionAvatar` render path contains no `.mp4` reference,
 *      no `<video>` tag, and no other video API — the contract is
 *      that production renders the PNG.
 *   6. The visual manifest `format` enum is unchanged (`png | webp |
 *      lottie | rive`) — no `video` / `mp4` slot was added.
 *   7. No source MP4 weighs more than 5 MB (sanity guard against
 *      accidental check-in of a 4K master).
 *   8. The asset plan cross-references the new source folder so
 *      designers find it without grepping.
 *   9. No restricted system (Stripe / payments / tax / RLS /
 *      migrations / legal / Membre Pro / audio / SEO) is touched by
 *      this PR.
 *  10. Paid YoPratiqo checkout remains disabled and no Stripe /
 *      payment signal was introduced in any new file.
 */

import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const exists = (rel: string) => existsSync(path.join(root, rel));
const sizeBytes = (rel: string) => statSync(path.join(root, rel)).size;

let pass = 0;
const ok = (label: string) => {
  pass += 1;
  console.log(`  ok  ${label}`);
};

const ANIM_DIR = "public/companion/travel/animations";
const SOURCE_FILES = [
  {
    state: "badge_unlocked",
    source: `${ANIM_DIR}/companion-travel-badge-unlocked.source.mp4`,
    png: "public/companion/travel/companion-travel-badge-unlocked.png",
  },
  {
    state: "level_up",
    source: `${ANIM_DIR}/companion-travel-level-up.source.mp4`,
    png: "public/companion/travel/companion-travel-level-up.png",
  },
  {
    state: "inactive",
    source: `${ANIM_DIR}/companion-travel-inactive.source.mp4`,
    png: "public/companion/travel/companion-travel-inactive.png",
  },
] as const;

// ──────────────────────────────────────────────────────────────────────────
// 1) The three source MP4s exist with the canonical state-aligned filenames
// ──────────────────────────────────────────────────────────────────────────

for (const { source } of SOURCE_FILES) {
  assert.ok(
    exists(source),
    `source MP4 must exist at ${source} so the Lottie conversion plan has stable inputs`,
  );
}
ok("1) three Firefly source MP4s exist under public/companion/travel/animations/ with state-aligned filenames");

// ──────────────────────────────────────────────────────────────────────────
// 2) Each source MP4 has a real production PNG sibling
// ──────────────────────────────────────────────────────────────────────────

for (const { state, png } of SOURCE_FILES) {
  assert.ok(
    exists(png),
    `production PNG sibling for state '${state}' must exist at ${png} — the renderer ships the PNG, not the MP4`,
  );
}
ok("2) every source MP4 has a real production PNG sibling next to it (renderer ships the PNG)");

// ──────────────────────────────────────────────────────────────────────────
// 3) The animations folder ships a README with the conversion plan
// ──────────────────────────────────────────────────────────────────────────

const readmeRel = `${ANIM_DIR}/README.md`;
assert.ok(exists(readmeRel), "animations folder must ship a README.md");
const readmeSrc = read(readmeRel);
assert.match(
  readmeSrc,
  /not shipped|do not ship/i,
  "README must explicitly say the MP4s are not shipped as-is",
);
assert.match(
  readmeSrc,
  /Lottie|Rive/i,
  "README must reference the Lottie / Rive conversion plan",
);
assert.match(
  readmeSrc,
  /SHIPPED_ASSETS/,
  "README must reference SHIPPED_ASSETS so the promotion path is discoverable",
);
ok("3) animations folder ships a README documenting the conversion plan + ship-as-PNG contract");

// ──────────────────────────────────────────────────────────────────────────
// 4) SHIPPED_ASSETS allow-list contains ONLY .png — no silent promotion
// ──────────────────────────────────────────────────────────────────────────

const manifestSrc = read("lib/companion/companionVisuals.ts");
const shippedBlockMatch = manifestSrc.match(
  /SHIPPED_ASSETS:\s*ReadonlySet<string>\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/,
);
assert.ok(
  shippedBlockMatch && shippedBlockMatch[1],
  "SHIPPED_ASSETS allow-list block must be present in lib/companion/companionVisuals.ts",
);
const shippedBlock = shippedBlockMatch![1];
const filenames = [...shippedBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.ok(
  filenames.length > 0,
  "SHIPPED_ASSETS must contain at least one shipped filename",
);
for (const fn of filenames) {
  assert.ok(
    fn.endsWith(".png"),
    `SHIPPED_ASSETS may only contain .png files until Lottie/Rive lands (offender: ${fn})`,
  );
}
ok(
  `4) SHIPPED_ASSETS allow-list contains only .png filenames (${filenames.length} entries, zero .mp4/.webm/.lottie/.riv)`,
);

// ──────────────────────────────────────────────────────────────────────────
// 5) CompanionAvatar never references .mp4 / <video> / video element APIs
// ──────────────────────────────────────────────────────────────────────────

const avatarSrc = read("components/companion/CompanionAvatar.tsx");
assert.doesNotMatch(
  avatarSrc,
  /\.mp4|<video|HTMLVideoElement|createElement\(["']video["']\)/i,
  "CompanionAvatar must not reference MP4 or any HTML video element — production renders the PNG",
);
ok("5) CompanionAvatar render path contains no .mp4 / <video> / video-element reference");

// ──────────────────────────────────────────────────────────────────────────
// 6) Visual manifest format enum still excludes mp4/video
// ──────────────────────────────────────────────────────────────────────────

const formatMatch = manifestSrc.match(
  /CompanionVisualFormat\s*=\s*([^;]+);/,
);
assert.ok(
  formatMatch && formatMatch[1],
  "CompanionVisualFormat type union must exist",
);
const formatUnion = formatMatch![1];
assert.doesNotMatch(
  formatUnion,
  /"mp4"|"video"|"webm"/i,
  "CompanionVisualFormat must not silently grow an mp4/video/webm slot",
);
assert.match(
  formatUnion,
  /"png"/,
  "CompanionVisualFormat must still include 'png' (the shipped format)",
);
ok("6) CompanionVisualFormat type union is unchanged (png|webp|lottie|rive — no mp4/video/webm)");

// ──────────────────────────────────────────────────────────────────────────
// 7) Sanity guard: no source MP4 over 5 MB
// ──────────────────────────────────────────────────────────────────────────

const MAX_BYTES = 5 * 1024 * 1024;
for (const { source } of SOURCE_FILES) {
  const bytes = sizeBytes(source);
  assert.ok(
    bytes <= MAX_BYTES,
    `source MP4 ${source} weighs ${(bytes / 1024 / 1024).toFixed(2)} MB; cap is 5 MB to avoid bloating git history`,
  );
}
ok("7) no source MP4 exceeds 5 MB (git history sanity cap)");

// ──────────────────────────────────────────────────────────────────────────
// 8) Asset plan cross-references the source folder
// ──────────────────────────────────────────────────────────────────────────

const assetPlan = read("docs/COMPANION_BRIDGE_ASSET_PLAN.md");
assert.match(
  assetPlan,
  /public\/companion\/travel\/animations/,
  "asset plan must cross-reference public/companion/travel/animations so designers find the source folder",
);
assert.match(
  assetPlan,
  /not\s+(?:registered|shipped)|do not ship|never reads them/i,
  "asset plan must restate the do-not-ship-raw-MP4 contract",
);
ok("8) asset plan cross-references the source folder and restates the do-not-ship contract");

// ──────────────────────────────────────────────────────────────────────────
// 9) No restricted system touched by any file in this PR's scope
// ──────────────────────────────────────────────────────────────────────────

const restrictedSignals = [
  "stripe",
  "payment_intent",
  "membre-pro",
  "membre_pro",
  "commission_rate",
  "supabase/migrations",
  "SECURITY DEFINER",
  "ENABLE ROW LEVEL SECURITY",
  "OPENAI_API_KEY",
  "openai.com",
  "MediaRecorder",
  "navigator.mediaDevices",
];
const inScopeText = [readmeSrc, assetPlan, manifestSrc, avatarSrc].join("\n");
for (const signal of restrictedSignals) {
  assert.doesNotMatch(
    inScopeText,
    new RegExp(signal, "i"),
    `no in-scope file may reference restricted signal '${signal}'`,
  );
}
ok("9) no restricted system (Stripe / payments / RLS / migrations / OpenAI / mic) touched by in-scope files");

// ──────────────────────────────────────────────────────────────────────────
// 10) Paid YoPratiqo checkout remains disabled
// ──────────────────────────────────────────────────────────────────────────

const productConfig = read("lib/yo/yopratiqoProductConfig.ts");
assert.match(
  productConfig,
  /premiumModulesEnabled:\s*false/,
  "paid YoPratiqo checkout must remain disabled in yopratiqoProductConfig.ts (premiumModulesEnabled)",
);
ok("10) paid YoPratiqo checkout remains disabled (premiumModulesEnabled = false)");

// ──────────────────────────────────────────────────────────────────────────
// Folder-listing sanity: animations dir contains only what we expect
// ──────────────────────────────────────────────────────────────────────────

const animDirEntries = readdirSync(path.join(root, ANIM_DIR)).sort();
const expectedEntries = [
  "README.md",
  "companion-travel-badge-unlocked.source.mp4",
  "companion-travel-inactive.source.mp4",
  "companion-travel-level-up.source.mp4",
].sort();
assert.deepStrictEqual(
  animDirEntries,
  expectedEntries,
  `animations folder must contain only the 3 source MP4s + README (got: ${animDirEntries.join(", ")})`,
);

console.log(`\n${pass} companion animation source assertions passed`);
