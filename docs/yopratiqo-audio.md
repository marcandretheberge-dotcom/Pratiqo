# YoPratiqo — pre-generated audio pipeline

Static audio for fixed YoPratiqo lesson content (vocabulary words,
short phrases, dialogue lines) is generated **once** by a local /
server script and served to the browser as plain MP3 files from a
public-read Supabase Storage bucket.

The browser never calls OpenAI. The browser never sees the
service-role key. Generation happens off-band; the lesson UI plays
the resulting MP3 with a standard `<audio>` element via
`components/yo/YoAudioPlayer.tsx`.

## Architecture

```
lib/yo/audio/audioManifest.ts       single source of truth for items
        ↓
scripts/generate-yopratiqo-audio.ts  POST /v1/audio/speech (OpenAI)
        ↓                            → MP3 buffer
Supabase Storage                     bucket = yopratiqo-audio
        ↓                            public read, no public write
components/yo/YoAudioPlayer.tsx      <audio src=public-url>
        ↓
app/yo/.../page.tsx                  one-line wiring, with fallback
```

## Storage path convention

Every MP3 lives at the deterministic path encoded by
`buildStoragePath()` in `lib/yo/audio/audioManifest.ts`:

```
yo/<targetLanguage>/<moduleId>/<lessonId>/<type>/<slug>.mp3
```

Examples:

```
yo/es/intro-a1/universal-words/word/hola.mp3
yo/es/intro-a1/universal-words/phrase/me-llamo.mp3
yo/es/voyage/republique-dominicaine-a1-lesson-01/dialogue/que-lo-que.mp3
```

Path safety rules (enforced by `tests/yo/yopratiqoAudio.test.ts`):

- ASCII-only — accents are stripped at slug time.
- Lowercase — no `Hola.mp3`, only `hola.mp3`.
- No spaces — non-`[a-z0-9]` runs collapse to a single `-`.
- Always ends in `.mp3`.
- Globally unique storage paths (no two manifest items share one).

## One-time Supabase Storage setup (manual)

1. Open the Supabase project dashboard → **Storage** → **Create
   bucket**:

   - Name: `yopratiqo-audio`
   - Public bucket: **enabled** (public read).

2. Confirm the bucket policy is **public read, authenticated /
   service-role write only**. The Supabase UI generates this when
   the "Public bucket" toggle is on; double-check by running a
   `curl` from a logged-out machine and confirming a `GET` succeeds
   while a direct `POST` is rejected.

   The script uploads using the **service-role key**, which bypasses
   RLS — so even with the public flag on, no client can write.

3. (Optional) Configure CDN-level cache headers via Supabase
   Storage's `Cache-Control` setting; the upload call already sets
   `public, max-age=31536000, immutable` per file, which is enough
   for most setups.

> Do not edit RLS policies for any other bucket as part of this
> setup. Only the new `yopratiqo-audio` bucket is in scope.

## Required environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | `.env.local` (server) | OpenAI auth for `/v1/audio/speech`. **Never** add a `NEXT_PUBLIC_` mirror. |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Already used elsewhere; the audio URL builder reads it client-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (server) | Already used by `lib/supabaseAdmin.ts`. The generator script uploads through it. |
| `YOPRATIQO_AUDIO_BUCKET` | optional | Override the default bucket name (`yopratiqo-audio`). |
| `YOPRATIQO_TTS_MODEL` | optional | Override the default OpenAI model (`gpt-4o-mini-tts`). |
| `YOPRATIQO_TTS_VOICE` | optional | Override the default voice (`alloy`). |

`.env.example` ships placeholders for the new variables — fill them
in `.env.local` only. **Never commit a real key.** Never add the
service-role key or the OpenAI key to a `NEXT_PUBLIC_*` variable —
both files are read by the browser bundle at build time.

## Run the generator

```bash
# Preview the plan without making any network calls or uploads.
npm run generate:yopratiqo-audio -- --dry-run

# Real run — generate every missing MP3 and upload it.
npm run generate:yopratiqo-audio

# Force-regenerate even if the object already exists.
npm run generate:yopratiqo-audio -- --force
```

Behaviour:

- **Idempotent.** Each item is checked against `storage.from(bucket).list()`
  before generation; existing objects are skipped.
- **Logs** TAP-style lines: `ok - generated …`, `skip - exists …`,
  `not ok - …`.
- **Exits non-zero** on any per-item failure or missing config so
  CI surfaces real errors instead of silently uploading nothing.

## Frontend usage

```tsx
import { YoAudioPlayer } from "@/components/yo/YoAudioPlayer";
import { findAudioItemByText } from "@/lib/yo/audio/audioManifest";

const item = findAudioItemByText("Hola");

return item ? (
  <YoAudioPlayer storagePath={item.storagePath} label={item.text} />
) : (
  // Fallback to the existing browser-native pronunciation button when
  // no pre-generated audio has been authored for this text yet.
  <YoPronunciationButton text="Hola" locale={locale} speechLang="es-ES" />
);
```

The player handles three failure modes without breaking the page:

1. `NEXT_PUBLIC_SUPABASE_URL` missing → renders an invisible
   placeholder so layout stays stable. Lesson page falls back to
   the Web Speech button.
2. MP3 returns 404 → the `<audio>` element fires `error`, the
   button switches to a disabled "audio unavailable" state.
3. Browser cannot decode the asset → same disabled state.

## Out of scope (Phase 1)

- **Live OpenAI TTS for learner-typed text.** Not wired into the UI.
  If we add it later, it MUST go through a server route — never
  ship `OPENAI_API_KEY` to the browser.
- **Slow / fast playback variants.** Manifest carries `voiceHint` so
  we can split into `<region>/normal` / `<region>/slow` paths later
  without renaming items.
- **Per-region voice routing.** Phase 1 uses one global voice; the
  `voiceHint` field is recorded but not branched on yet.
