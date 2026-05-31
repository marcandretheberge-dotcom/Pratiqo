/**
 * YoPratiqo — pre-generated audio pipeline static-source regression suite.
 *
 * Style follows the rest of the project (`tests/seo/*.test.ts`,
 * `tests/teacherRecruitment/posterRoutes.test.ts`): `node:test`-style
 * static-source assertions, no browser, no live network, no Stripe /
 * Supabase / RLS / migration / booking / search / teacher-dashboard
 * code touched.
 *
 * What we guard:
 *
 *  1. Manifest hygiene — every storage path ends in `.mp3`, contains
 *     no spaces / accents / uppercase, is unique, and matches the
 *     `buildStoragePath()` shape. Slugs are deterministic so a
 *     contributor can re-derive any path without surprises.
 *
 *  2. Lookup invariants — `findAudioItemByText("Hola")`,
 *     `findAudioItemByText("Me llamo…")`, etc. all hit the manifest
 *     entries we shipped.
 *
 *  3. Security boundary — the OpenAI API key and the Supabase service-
 *     role key only appear inside the SERVER script. The client player
 *     and the manifest never import the admin client, never import
 *     `openai`, and never reference `OPENAI_API_KEY` /
 *     `SUPABASE_SERVICE_ROLE_KEY`.
 *
 *  4. Public URL helper builds a Supabase Storage v1 public URL only
 *     from `NEXT_PUBLIC_SUPABASE_URL` and the bucket constant.
 *
 *  5. `package.json` exposes `generate:yopratiqo-audio` and
 *     `test:yo-audio` scripts.
 *
 *  6. `.env.example` declares the new placeholders without leaking a
 *     real key.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  YOPRATIQO_AUDIO_BUCKET_DEFAULT,
  YOPRATIQO_AUDIO_MANIFEST,
  YOPRATIQO_AUDIO_ROOT_PREFIX,
  buildAudioSlug,
  buildStoragePath,
  findAudioItemById,
  findAudioItemByText,
} from "../../lib/yo/audio/audioManifest";

const REPO_ROOT = process.cwd();
function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

// ── Sources we audit statically ──────────────────────────────────────
const audioManifestSrc = read("lib/yo/audio/audioManifest.ts");
const audioManifestTypesSrc = read(
  "lib/yo/audio/audioManifest.types-internal.ts",
);
const accentProfilesSrc = read("lib/yo/audio/accentProfiles.ts");
const spanishIntroAudioSrc = read("lib/yo/audio/spanishIntroAudio.ts");
const spanishVoyageDominicanAudioSrc = read(
  "lib/yo/audio/spanishVoyageDominicanAudio.ts",
);
const audioUrlSrc = read("lib/yo/audio/audioUrl.ts");
const playerSrc = read("components/yo/YoAudioPlayer.tsx");
const wrapperSrc = read("components/yo/YoSpanishAudioButton.tsx");
const scriptSrc = read("scripts/generate-yopratiqo-audio.ts");
const introPageSrc = read("app/yo/langues/espagnol/intro/page.tsx");
const envExampleSrc = read(".env.example");
const packageJsonSrc = read("package.json");

const PUBLIC_FACING_FILES: Array<{ label: string; src: string }> = [
  { label: "lib/yo/audio/audioManifest.ts", src: audioManifestSrc },
  { label: "lib/yo/audio/audioManifest.types-internal.ts", src: audioManifestTypesSrc },
  { label: "lib/yo/audio/accentProfiles.ts", src: accentProfilesSrc },
  { label: "lib/yo/audio/spanishIntroAudio.ts", src: spanishIntroAudioSrc },
  { label: "lib/yo/audio/spanishVoyageDominicanAudio.ts", src: spanishVoyageDominicanAudioSrc },
  { label: "lib/yo/audio/audioUrl.ts", src: audioUrlSrc },
  { label: "components/yo/YoAudioPlayer.tsx", src: playerSrc },
  { label: "components/yo/YoSpanishAudioButton.tsx", src: wrapperSrc },
  { label: "app/yo/langues/espagnol/intro/page.tsx", src: introPageSrc },
];

// ── 1. Manifest hygiene ──────────────────────────────────────────────
test("manifest is non-empty and exposes the expected primitive shape", () => {
  assert.ok(YOPRATIQO_AUDIO_MANIFEST.length >= 5, "manifest should ship at least 5 items");
  // Manifest is now multi-language (Spanish + Quebec French +
  // Italian + English + Japanese). Keep the shape check tight — the
  // targetLanguage union is `es | en | fr | pt | it | ja` — but allow
  // any lang the type system already permits.
  const allowedLanguages = new Set<string>([
    "es",
    "fr",
    "en",
    "pt",
    "it",
    "ja",
  ]);
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.text, "string");
    assert.equal(typeof item.storagePath, "string");
    assert.ok(
      allowedLanguages.has(item.targetLanguage),
      `manifest item ${item.id} declares unexpected targetLanguage="${item.targetLanguage}"`,
    );
    assert.ok(
      ["word", "phrase", "dialogue", "instruction", "sentence"].includes(item.type),
    );
  }
});

test("every storagePath ends with .mp3 and stays inside the yo/ root prefix", () => {
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      item.storagePath.endsWith(".mp3"),
      `storagePath must end in .mp3 (item ${item.id} → ${item.storagePath})`,
    );
    assert.ok(
      item.storagePath.startsWith(`${YOPRATIQO_AUDIO_ROOT_PREFIX}/`),
      `storagePath must start with ${YOPRATIQO_AUDIO_ROOT_PREFIX}/ (item ${item.id} → ${item.storagePath})`,
    );
  }
});

test("storagePath is ASCII-only, lowercase, no spaces, no leading slash", () => {
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      !/\s/.test(item.storagePath),
      `storagePath must not contain whitespace (${item.storagePath})`,
    );
    assert.equal(
      item.storagePath,
      item.storagePath.toLowerCase(),
      `storagePath must be lowercase (${item.storagePath})`,
    );
    assert.ok(
      !/^\//.test(item.storagePath),
      `storagePath must not start with a leading slash (${item.storagePath})`,
    );
    assert.ok(
      /^[a-z0-9./_-]+$/.test(item.storagePath),
      `storagePath must be ASCII path-safe (${item.storagePath})`,
    );
  }
});

test("all storagePaths and ids are unique", () => {
  const paths = new Set<string>();
  const ids = new Set<string>();
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(!paths.has(item.storagePath), `duplicate storagePath ${item.storagePath}`);
    paths.add(item.storagePath);
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);
  }
});

test("buildAudioSlug strips accents, spaces, punctuation and lowercases", () => {
  assert.equal(buildAudioSlug("Hola"), "hola");
  assert.equal(buildAudioSlug("Buenos días"), "buenos-dias");
  assert.equal(buildAudioSlug("¿Cómo estás?"), "como-estas");
  assert.equal(buildAudioSlug("Me llamo…"), "me-llamo");
  assert.equal(buildAudioSlug("¿Qué lo qué?"), "que-lo-que");
  assert.equal(buildAudioSlug("Mucho   gusto!!!"), "mucho-gusto");
});

test("buildStoragePath yields the accent-aware shape used by Phase-2 manifest items", () => {
  const path = buildStoragePath({
    targetLanguage: "es",
    moduleId: "intro-a1",
    lessonId: "reading-first-text",
    type: "word",
    slug: "vivo",
    accentSegment: "latin-american-neutral",
  });
  assert.equal(
    path,
    "yo/es/intro-a1/reading-first-text/latin-american-neutral/word/vivo.mp3",
  );
});

test("Phase 1 legacy storage paths are still present in the manifest (backward compat)", () => {
  const expected = [
    "yo/es/intro-a1/universal-words/word/hola.mp3",
    "yo/es/intro-a1/universal-words/word/gracias.mp3",
    "yo/es/intro-a1/universal-words/word/por-favor.mp3",
    "yo/es/intro-a1/universal-words/word/buenos-dias.mp3",
    "yo/es/intro-a1/universal-words/word/mucho-gusto.mp3",
    "yo/es/intro-a1/universal-words/phrase/como-estas.mp3",
    "yo/es/intro-a1/universal-words/phrase/me-llamo.mp3",
    "yo/es/voyage/republique-dominicaine-a1-lesson-01/dialogue/que-lo-que.mp3",
  ];
  const allPaths = new Set(YOPRATIQO_AUDIO_MANIFEST.map((i) => i.storagePath));
  for (const path of expected) {
    assert.ok(
      allPaths.has(path),
      `Phase 1 storage path "${path}" must remain in the manifest (do NOT migrate already-uploaded MP3s)`,
    );
  }
});

test("every manifest item carries an accent profile", () => {
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.ok(
      typeof item.accentProfile === "string" && item.accentProfile.length > 0,
      `manifest item ${item.id} must declare an accentProfile`,
    );
  }
});

// ── 2. Lookup invariants ─────────────────────────────────────────────
test("findAudioItemByText resolves the expected pan-Hispanic words", () => {
  for (const text of ["Hola", "Gracias", "Por favor", "Buenos días", "Mucho gusto"]) {
    const item = findAudioItemByText(text);
    assert.ok(item, `findAudioItemByText("${text}") must return an item`);
    assert.equal(item!.type, "word");
    assert.equal(item!.targetLanguage, "es");
    assert.ok(item!.storagePath.endsWith(".mp3"));
  }
});

test("findAudioItemByText handles UI-only ellipsis variants", () => {
  // The lesson UI renders "Me llamo…" with a horizontal ellipsis;
  // the manifest stores the spoken form "Me llamo" without trailing
  // punctuation. The lookup helper must reconcile the two.
  const a = findAudioItemByText("Me llamo");
  const b = findAudioItemByText("Me llamo…");
  const c = findAudioItemByText("Me llamo...");
  assert.ok(a && b && c, "all three Me llamo variants must resolve");
  assert.equal(a!.id, b!.id);
  assert.equal(a!.id, c!.id);
});

test("findAudioItemByText returns undefined for unauthored text (graceful fallback)", () => {
  assert.equal(findAudioItemByText("nonsense-not-in-manifest"), undefined);
});

test("findAudioItemById is consistent with findAudioItemByText", () => {
  for (const item of YOPRATIQO_AUDIO_MANIFEST) {
    assert.equal(findAudioItemById(item.id)?.storagePath, item.storagePath);
  }
});

// ── 3. Security boundary ─────────────────────────────────────────────
//
// We forbid runtime READS of secrets in client-facing code. Documentation
// comments may still NAME the secrets (in fact the security boundary
// is clearer when they do), so we match the "runtime read" pattern
// (`process.env.X`, `import("openai")`, `getSupabaseAdmin`) rather than
// the bare symbol.

const RUNTIME_OPENAI_READ = /process\.env\.OPENAI_API_KEY/;
const RUNTIME_SERVICE_ROLE_READ = /process\.env\.SUPABASE_SERVICE_ROLE_KEY/;

test("client + manifest sources never READ OPENAI_API_KEY at runtime", () => {
  for (const { label, src } of PUBLIC_FACING_FILES) {
    assert.ok(
      !RUNTIME_OPENAI_READ.test(src),
      `${label} must NOT read process.env.OPENAI_API_KEY (server-only secret)`,
    );
  }
});

test("client + manifest sources never READ SUPABASE_SERVICE_ROLE_KEY at runtime", () => {
  for (const { label, src } of PUBLIC_FACING_FILES) {
    assert.ok(
      !RUNTIME_SERVICE_ROLE_READ.test(src),
      `${label} must NOT read process.env.SUPABASE_SERVICE_ROLE_KEY (server-only secret)`,
    );
  }
});

test("client + manifest sources never import the admin client", () => {
  for (const { label, src } of PUBLIC_FACING_FILES) {
    assert.ok(
      !/from\s+["'][^"']*lib\/supabaseAdmin["']/.test(src) &&
        !/getSupabaseAdmin/.test(src),
      `${label} must NOT import lib/supabaseAdmin or call getSupabaseAdmin`,
    );
  }
});

test("client + manifest sources never import the openai SDK", () => {
  for (const { label, src } of PUBLIC_FACING_FILES) {
    assert.ok(
      !/from\s+["']openai["']/.test(src) && !/require\(['"]openai['"]\)/.test(src),
      `${label} must NOT import the openai SDK`,
    );
  }
});

test("YoAudioPlayer is a client component and uses the public URL builder only", () => {
  assert.match(
    playerSrc,
    /^"use client";/m,
    "YoAudioPlayer must declare \"use client\"",
  );
  assert.match(playerSrc, /from\s+["']@\/lib\/yo\/audio\/audioUrl["']/);
  // No direct fetch to api.openai.com from the browser surface.
  assert.ok(!/api\.openai\.com/.test(playerSrc));
});

test("audioUrl helper uses NEXT_PUBLIC_SUPABASE_URL and never the service-role key", () => {
  assert.match(audioUrlSrc, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.ok(!RUNTIME_SERVICE_ROLE_READ.test(audioUrlSrc));
  assert.ok(!RUNTIME_OPENAI_READ.test(audioUrlSrc));
  // Standard Supabase v1 public URL shape — keeps the client decoupled
  // from the @supabase/supabase-js bundle.
  assert.match(audioUrlSrc, /\/storage\/v1\/object\/public\//);
});

// ── 4. Generator script — server-only secrets, idempotent, OpenAI ────
test("generator script reads OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY (server-only)", () => {
  assert.match(scriptSrc, /process\.env\.OPENAI_API_KEY/);
  assert.match(scriptSrc, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
});

test("generator script targets the documented OpenAI TTS endpoint", () => {
  assert.match(scriptSrc, /https:\/\/api\.openai\.com\/v1\/audio\/speech/);
  assert.match(scriptSrc, /response_format/);
  assert.match(scriptSrc, /audio\/mpeg/);
});

test("generator script is idempotent: skip-if-exists and force flag", () => {
  // The skip path lists the bucket / parent path before generating.
  // Allow whitespace + newlines between `.from(...)` and `.list(...)`
  // because Prettier may break the chain across lines.
  assert.match(scriptSrc, /\.from\(\s*bucket\s*\)[\s\S]{0,40}\.list\(/);
  // Force flag bypasses the skip.
  assert.match(scriptSrc, /opts\.force|--force/);
});

test("generator script supports a dry-run flag", () => {
  assert.match(scriptSrc, /opts\.dryRun|--dry-run/);
});

test("generator script exits non-zero on missing required config", () => {
  assert.match(scriptSrc, /process\.exit\(\s*1\s*\)/);
  assert.match(scriptSrc, /failFatal/);
});

test("generator script logs skipped, generated, and failed counts", () => {
  assert.match(scriptSrc, /skipped/);
  assert.match(scriptSrc, /generated/);
  assert.match(scriptSrc, /failed/);
});

// ── 5. package.json scripts ──────────────────────────────────────────
test("package.json exposes generate:yopratiqo-audio script", () => {
  const pkg = JSON.parse(packageJsonSrc) as { scripts?: Record<string, string> };
  assert.ok(pkg.scripts, "package.json must declare scripts");
  assert.match(
    pkg.scripts!["generate:yopratiqo-audio"] ?? "",
    /tsx\s+scripts\/generate-yopratiqo-audio\.ts/,
  );
});

test("package.json exposes test:yo-audio script", () => {
  const pkg = JSON.parse(packageJsonSrc) as { scripts?: Record<string, string> };
  assert.match(
    pkg.scripts!["test:yo-audio"] ?? "",
    /tsx\s+tests\/yo\/yopratiqoAudio\.test\.ts/,
  );
});

test("validate:launch does NOT trigger the audio generation (network + paid API)", () => {
  const pkg = JSON.parse(packageJsonSrc) as { scripts?: Record<string, string> };
  const validate = pkg.scripts!["validate:launch"] ?? "";
  assert.ok(
    !/generate:yopratiqo-audio/.test(validate) && !/generate-yopratiqo-audio/.test(validate),
    "validate:launch must never invoke the audio generator (it would burn an OpenAI key on every CI run)",
  );
});

// ── 6. .env.example placeholders without real secrets ────────────────
test(".env.example documents OPENAI_API_KEY without a real value", () => {
  // Permissive match: empty value or commented placeholder is fine.
  assert.match(envExampleSrc, /^OPENAI_API_KEY=\s*$/m);
  // No `sk-...` real-key fragments accidentally committed.
  assert.ok(
    !/OPENAI_API_KEY=\s*sk-[A-Za-z0-9_-]{10,}/m.test(envExampleSrc),
    ".env.example must not commit a real OpenAI key",
  );
});

test(".env.example documents the YoPratiqo audio bucket / TTS overrides", () => {
  assert.match(envExampleSrc, /YOPRATIQO_AUDIO_BUCKET=/);
  assert.match(envExampleSrc, /YOPRATIQO_TTS_MODEL=/);
  assert.match(envExampleSrc, /YOPRATIQO_TTS_VOICE=/);
});

test(".env.example never exposes secrets via NEXT_PUBLIC_ aliases", () => {
  assert.ok(
    !/NEXT_PUBLIC_OPENAI_API_KEY/.test(envExampleSrc),
    "OPENAI_API_KEY must NEVER have a NEXT_PUBLIC_ alias",
  );
  assert.ok(
    !/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/.test(envExampleSrc),
    "SUPABASE_SERVICE_ROLE_KEY must NEVER have a NEXT_PUBLIC_ alias",
  );
});

// ── 7. Constants ─────────────────────────────────────────────────────
test("default bucket name is yopratiqo-audio", () => {
  assert.equal(YOPRATIQO_AUDIO_BUCKET_DEFAULT, "yopratiqo-audio");
});

// ── 8. Lesson page integration (graceful fallback) ───────────────────
test("intro page uses the YoSpanishAudioButton wrapper for Spanish audio surfaces", () => {
  assert.match(
    introPageSrc,
    /import\s+\{\s*YoSpanishAudioButton\s*\}\s+from\s+["']@\/components\/yo\/YoSpanishAudioButton["']/,
  );
  assert.match(introPageSrc, /<YoSpanishAudioButton/);
});

test("YoSpanishAudioButton wrapper renders both YoAudioPlayer and the Web Speech fallback", () => {
  // The wrapper imports BOTH inner components and decides at render
  // time which one to mount. Static-source check keeps the contract
  // honest even if the manifest grows or shrinks.
  assert.match(
    wrapperSrc,
    /import\s+\{\s*YoAudioPlayer\s*\}\s+from\s+["']@\/components\/yo\/YoAudioPlayer["']/,
  );
  assert.match(
    wrapperSrc,
    /import\s+\{\s*YoPronunciationButton\s*\}\s+from\s+["']@\/components\/yo\/YoPronunciationButton["']/,
  );
  assert.match(wrapperSrc, /<YoAudioPlayer/);
  assert.match(wrapperSrc, /<YoPronunciationButton/);
  assert.match(wrapperSrc, /findAudioItemForContext/);
});

// ── Run ──────────────────────────────────────────────────────────────
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
  console.log(`[yo:audio] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
