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

The manifest supports two layouts. Both are deterministic and tested
in `tests/yo/yopratiqoAudio.test.ts`.

### Phase 1 (legacy) — no accent segment

Used by the eight Phase 1 entries that are already uploaded. Kept
indefinitely so previously-generated MP3s are never orphaned. Built
by `buildLegacyStoragePath()`.

```
yo/<targetLanguage>/<moduleId>/<lessonId>/<type>/<slug>.mp3
```

Examples:

```
yo/es/intro-a1/universal-words/word/hola.mp3
yo/es/intro-a1/universal-words/phrase/me-llamo.mp3
yo/es/voyage/republique-dominicaine-a1-lesson-01/dialogue/que-lo-que.mp3
```

### Phase 2 (accent-aware) — every NEW lesson

Used by every entry added in Phase 2. The accent segment groups MP3s
inside Supabase Storage so a contributor can spot regional clusters
at a glance. Built by `buildStoragePath()`.

```
yo/<targetLanguage>/<moduleId>/<lessonId>/<accentSlug>/<type>/<slug>.mp3
```

Examples:

```
yo/es/intro-a1/reading-first-text/latin-american-neutral/word/vivo.mp3
yo/es/voyage/republique-dominicaine-a1-lesson-01/dominican-republic/phrase/tato.mp3
```

Path safety rules (enforced by `tests/yo/yopratiqoAudio.test.ts`):

- ASCII-only — accents are stripped at slug time.
- Lowercase — no `Hola.mp3`, only `hola.mp3`.
- No spaces — non-`[a-z0-9]` runs collapse to a single `-`.
- Always ends in `.mp3`.
- Globally unique storage paths (no two manifest items share one).

## Accent profiles

Spanish lesson audio is tagged with a typed accent profile defined in
`lib/yo/audio/accentProfiles.ts`:

| Profile id              | Path slug                | Used by                                       |
| ----------------------- | ------------------------ | --------------------------------------------- |
| `latin_american_neutral`| `latin-american-neutral` | Intro module · pan-Hispanic vocabulary        |
| `dominican_republic`    | `dominican-republic`     | República Dominicana dictionary + dialogue + Dominican dishes |
| `puerto_rico`           | `puerto-rico`            | Reserved (no Puerto Rico module yet)          |
| `rioplatense_uruguay`   | `rioplatense-uruguay`    | Reserved (no Uruguay module yet)              |
| `spain_neutral`         | `spain-neutral`          | Reserved (future European Spanish content)    |

Each profile carries a beginner-friendly TTS instruction string the
generator passes to OpenAI's `instructions` field on steerable models
(`gpt-4o-mini-tts`). **OpenAI TTS accent steering is best-effort.**
Do not promise "native [country] speaker" anywhere in marketing copy
— the generator clings to that boundary in
`tests/yo/yopratiqoSpanishAudioCoverage.test.ts`.

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

Use the `YoSpanishAudioButton` wrapper at every Spanish lesson
surface. It centralises the contextual manifest lookup and falls
back to the on-device `YoPronunciationButton` (Web Speech) when no
MP3 matches.

```tsx
import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";

<YoSpanishAudioButton
  text={word.target}
  locale={locale}
  moduleId="voyage"
  lessonId="republique-dominicaine-a1-lesson-01"
  accentProfile="dominican_republic"
  speechLang="es-DO"
/>
```

Lookup precedence (defined in `audioManifest.ts →
findAudioItemForContext`):

1. Exact match on (moduleId, lessonId, type, normalised text,
   accent profile).
2. Match on (moduleId, normalised text, accent profile).
3. Match on (normalised text, accent profile).
4. Match on (normalised text, `latin_american_neutral`) — graceful
   degrade so a Caribbean module never breaks just because a
   pan-Hispanic word was only recorded once.
5. Plain text match (any accent).

The player handles three failure modes without breaking the page:

1. `NEXT_PUBLIC_SUPABASE_URL` missing → renders an invisible
   placeholder so layout stays stable. Lesson page falls back to
   the Web Speech button.
2. MP3 returns 404 → the `<audio>` element fires `error`, the
   button switches to a disabled "audio unavailable" state.
3. Browser cannot decode the asset → same disabled state.

## Out of scope

- **Live OpenAI TTS for learner-typed text.** Not wired into the UI.
  If we add it later, it MUST go through a server route — never
  ship `OPENAI_API_KEY` to the browser.
- **Per-card slow / fast playback variants.** Manifest carries
  `voiceHint` so we can split into `<region>/normal` /
  `<region>/slow` paths later without renaming items.
- **Global accent selector UI.** Each module currently picks the
  correct accent (intro = neutral; RD = Dominican). A future global
  selector can read the profile id from a context provider without
  changing the manifest shape.
