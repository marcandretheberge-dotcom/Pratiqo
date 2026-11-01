# Japanese foundations audio — generation report

## Run identity

| Field | Value |
| --- | --- |
| Client date (America/Toronto) | 2026-10-31 evening / 2026-11-01 early UTC |
| UTC stamp | 2026-11-01T01:54:05Z (full generate summary) |
| Branch | `feat/yopratiqo-japanese-foundations-20261030` |
| Base commit before this publication | `5c2b34458282c6a233c460d4156fe4c6740790f3` |
| Docs evidence commit | `7e5961146d44464590cc2527c811c009bc6f838f` |
| PR | https://github.com/marcandretheberge-dotcom/Pratiqo/pull/415 |
| Preview | https://pratiqo-git-feat-yopr-afa356-marcandretheberge-dotcoms-projects.vercel.app |

## Target storage

| Field | Value |
| --- | --- |
| Supabase project | `jwlbwmxoradmbuvqfkhe` |
| Public URL | `https://jwlbwmxoradmbuvqfkhe.supabase.co` |
| Bucket | `yopratiqo-audio` |
| Module | `japanese-foundations` (exact filter) |
| Path prefix | `yo/ja/japanese-foundations/v1/japanese-standard/<type>/<slug>.mp3` |

## TTS parameters actually applied

| Parameter | Value |
| --- | --- |
| Endpoint | `POST https://api.openai.com/v1/audio/speech` |
| Model | `gpt-4o-mini-tts` (`YOPRATIQO_TTS_MODEL` unset) |
| Voice | `alloy` (Japanese accent profile; `YOPRATIQO_TTS_VOICE` unset) |
| Format / MIME | `mp3` / `audio/mpeg` |
| Speed request param | none (player slow mode is 0.78× client-side) |

Pronunciation hints and kana/kanji reading instructions from `japaneseFoundationAudio.ts` were preserved.

## Environment check (presence only — no secret values)

| Variable | Present |
| --- | --- |
| `OPENAI_API_KEY` | yes (`.env.local` in the generator process) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | yes → `jwlbwmxoradmbuvqfkhe.supabase.co` |
| `YOPRATIQO_AUDIO_BUCKET` | yes → `yopratiqo-audio` |
| `YOPRATIQO_TTS_MODEL` / `YOPRATIQO_TTS_VOICE` | unset → defaults above |

## Offline plan

```text
npm run generate:yo-japanese-foundations-audio -- --dry-run
→ mode=dry-run module=japanese-foundations bucket=yopratiqo-audio selected=206
→ offline plan: 206 items, 1368 input characters
```

All planned paths use the `yo/ja/japanese-foundations/...` prefix only (see `expected-paths.txt`). No OpenAI or upload calls.

## Canary

```text
npm run generate:yo-japanese-foundations-audio -- --limit 3
→ {"selected":3,"generated":3,"cached":0,"uploaded":3,"skipped":0,"verified":3,"failed":0}
```

Public HEAD samples (200 / `audio/mpeg`):

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `.../sentence/konnichiwa-aya-desu-5dba65dd4118.mp3` | 33024 | `3ca3650887dbafd40089969bdd64ebec3c784f438e8f0eb2bc3e9c002d25af4d` |
| `.../sentence/hajimemashite-arekkusu-desu-1b8db15bd1d9.mp3` | 61056 | `b3dcb31e112b023146e346e97f835f337a60231ce4f8ef59ab2218673e520218` |
| `.../sentence/gakusei-desu-ka-ac8b285360ed.mp3` | 24960 | `dbc11d1ba54c5448758ba427f310ceee03c98beafdf330afbbd889413fcf004c` |

## Full generation

```text
npm run generate:yo-japanese-foundations-audio
→ {"selected":206,"generated":203,"cached":0,"uploaded":203,"skipped":3,"verified":206,"failed":0}
```

Session totals (canary + full): **206 generated/uploaded**, **0 failed**. The three canary objects were skipped as already present on the full run.

Local durable cache (Git-ignored): **206 MP3 files**, **6 872 832 bytes**.

## Public verification

```text
npm run verify:yo-japanese-foundations-audio
→ {"selected":206,"generated":0,"cached":0,"uploaded":0,"skipped":0,"verified":206,"failed":0}
```

Verification inspected every expected manifest path (not a bucket object count). Provenance SHA-256 matched for items with local cache.

Additional samples (HTTP 200, `audio/mpeg`, MPEG sync `fff3`):

- `.../word/n-3bad3747efd8.mp3` — 19200 bytes
- `.../word/konnichiwa-125aeadf27b0.mp3` — 17664 bytes
- `.../sentence/sumimasen-ocha-o-kudasai-79a71643869d.mp3` — 52224 bytes

Japanese introduction objects remain available (sample `yo/ja/japanese-intro/.../hajimemashite.mp3` → 200 / 25728 bytes). Other courses were not regenerated.

## Automated tests / build

- `npm run test:yo-japanese-recorded-audio` — passed (manifest + player + generator)
- `npm run test:yo-japanese-foundations` — run after restoring LF KanjiVG checkout bytes (Windows CRLF checkout previously failed the intact-source blob assertion for `人` / `04eba.svg`; no SVG content was intentionally rewritten beyond matching `HEAD` blobs)

## Browser / pronunciation QA

Preview: `https://pratiqo-git-feat-yopr-afa356-marcandretheberge-dotcoms-projects.vercel.app/yo/langues/japonais/parcours/module-1`

| Check | Result |
| --- | --- |
| Dialogue play → Stop (`こんにちは。アヤです。`) | OK |
| Slow 0.78× pressed, replay | OK |
| Listening exercise (`Écouter : le message de l’exercice` — answer not in label) + transcript control | OK |
| Kana `あ` play | OK |
| Kanji context word `人` play | OK |
| Activity change stops prior audio | OK (stage switch while playing) |
| Yoppo « Un exemple » → `私はアレックスです。` play | OK |
| AI voice disclosure / no `speechSynthesis` | OK |
| Ear-based pronunciation QA (ん, long vowels, particles, contextual readings) | **not claimed** |

## Safety notes

- No global `--force`
- Cache and `.env.local` remain outside Git
- No secrets written into this document
- Flashcard `autoplay` / `graded` modes and future SM-2 persistence are unchanged and must not be described as newly shipped by this audio publication
