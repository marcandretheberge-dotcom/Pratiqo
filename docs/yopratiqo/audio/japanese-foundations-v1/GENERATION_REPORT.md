# Japanese foundations audio — generation report

## Run identity

| Field | Value |
| --- | --- |
| Client date (America/Toronto) | 2026-10-30 evening / 2026-10-31 early UTC |
| UTC stamp | 2026-10-31T01:45:49Z |
| Branch | `feat/yopratiqo-japanese-foundations-20261030` |
| Commit | `b973b3ec682d882fa436166a35fd02e2d0e870c0` |
| PR | https://github.com/marcandretheberge-dotcom/Pratiqo/pull/415 |
| Preview | https://pratiqo-git-feat-yopr-afa356-marcandretheberge-dotcoms-projects.vercel.app |

## Target storage

| Field | Value |
| --- | --- |
| Supabase project | `jwlbwmxoradmbuvqfkhe` |
| Bucket | `yopratiqo-audio` (public, `audio/mpeg` only, max 5 MiB) |
| Module | `japanese-foundations` |
| Path prefix | `yo/ja/japanese-foundations/v1/japanese-standard/<type>/<slug>.mp3` |

## TTS parameters that this series would apply

Dry-run and code defaults (no env overrides were set):

| Parameter | Value |
| --- | --- |
| Endpoint | `POST https://api.openai.com/v1/audio/speech` |
| Model | `gpt-4o-mini-tts` (`YOPRATIQO_TTS_MODEL` unset) |
| Voice | `alloy` (Japanese accent profile; `YOPRATIQO_TTS_VOICE` unset) |
| Format / MIME | `mp3` / `audio/mpeg` |
| Speed request param | none (player slow mode is 0.78× client-side) |

These model/voice values are **planned for this run**. They must not be attributed to any object that already existed without provenance.

## Environment check (presence only)

| Variable | In Cloud Agent process | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | present | Matches project `jwlbwmxoradmbuvqfkhe` |
| `SUPABASE_SERVICE_ROLE_KEY` | present | Lists bucket; uploads `audio/mpeg` successfully (text/plain rejected by bucket MIME allowlist) |
| `OPENAI_API_KEY` | **missing** | Not in process env; not among Vercel project env **names**. Blocks Speech API generation |
| `YOPRATIQO_AUDIO_BUCKET` | unset | Default `yopratiqo-audio` used |
| `YOPRATIQO_TTS_MODEL` / `YOPRATIQO_TTS_VOICE` | unset | Defaults above apply |

Edge Function secrets alone do not populate this Node generator. `OPENAI_API_KEY` was requested as a Cursor Cloud Agent / environment secret.

## Offline plan

```sh
npm run generate:yo-japanese-foundations-audio -- --dry-run
```

Result:

- Selected: **206** items, module filter exact `japanese-foundations`
- Unique storage paths: **206** (see `expected-paths.txt`)
- Input characters planned: **1368**
- No network, disk writes, or API cost

## Live generation

Not started. `--limit 3` and the full batch require `OPENAI_API_KEY`.

## Storage inventory (this verification)

| Scope | Count |
| --- | --- |
| Expected foundation paths | 206 |
| Objects under `yo/ja/japanese-foundations/` | **0** |
| Japanese introduction objects preserved | **36** under `yo/ja/japanese-intro/` |
| Other `yo/` objects (other courses) | 252 (untouched) |

Sample introduction public check:

- Path: `yo/ja/japanese-intro/intro/japanese-standard/phrase/hajimemashite.mp3`
- HTTP 200, `audio/mpeg`, 25 728 bytes, SHA-256 `6090b830ac1c68930afbf39a0d54f0f4f2ec76cde5ad9fd5a4bf5016f7fb5d8a`

## Public verification

```sh
npm run verify:yo-japanese-foundations-audio
```

Summary: `selected=206 generated=0 cached=0 uploaded=0 skipped=0 verified=0 failed=206`

Every foundation URL returned HTTP 400 (object absent). No SHA-256 provenance comparison was possible because no foundation bytes exist yet.

## Counts for this attempt

| Metric | Count |
| --- | --- |
| Expected | 206 |
| Generated (OpenAI) | 0 |
| Reused from local cache | 0 |
| Uploaded | 0 |
| Already present | 0 |
| Verified | 0 |
| Failed | 206 |

## Automated tests

```sh
npm run test:yo-japanese-foundations
```

Passed (manifest, recorded-audio player wiring, generator unit tests included). Logs: agent artifact `ja-foundations-tests.log`.

## Browser / pronunciation

Preview exercised on 2026-10-31 UTC (share link to branch deployment for commit `b973b3ec`):

- Course entry, Module 1 dialogue / kana / kanji context, Module 2 stage change, Module 3 listening exercise, Yoppo companion hint.
- Missing-file UX: explicit French retry/transcript message (*« La lecture a été interrompue ou n'a pas démarré… »*), not silent failure.
- « Voix IA » attribution and mission disclaimer visible.
- « Ralentir » (0.78×) control present; no overlapping audio across stage changes.
- Listening choice labels do not reveal the Japanese answer.
- Artifacts under the agent run: `ja-foundations-missing-audio-error.png`, `ja-foundations-kana-missing-audio.png`, `ja-foundations-kanji-missing-audio.png`, `ja-foundations-yoppo-hint.png`, etc.

**Foundation MP3 start/stop/slow success paths were not verified** — objects are absent. Pronunciation quality (short kana, ん, long vowels, particles, contextual kanji readings) was **not** assessed: nothing to hear.

## Flashcard / SM-2 note

Autoplay and graded modes belong to flashcard surfaces, not this course player. SM-2 spaced repetition must not be described as persisted for this course until those components actually persist it.

## Blocker

**Cause:** `OPENAI_API_KEY` is not available in the Cloud Agent process environment that runs `scripts/generate-yopratiqo-audio.ts`.

**Not blocking:** Supabase URL, service-role Storage write for `audio/mpeg`, bucket config, offline manifest (206 unique paths), introduction archive (36 files), automated course/audio tests.

**Next step after the secret is injected into the Cursor environment (not pasted into chat):**

```sh
npm run generate:yo-japanese-foundations-audio -- --limit 3
# inspect public URLs / MP3 validity
npm run generate:yo-japanese-foundations-audio
npm run verify:yo-japanese-foundations-audio
# then browser listen + update this report to 206/206
```

Do not use `--force` for the whole series. Keep `.cache/yopratiqo-audio/` local (gitignored).
