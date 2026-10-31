# Italian course audio — generation report (2026-10-31)

## Scope

- Repository: `marcandretheberge-dotcom/Pratiqo`
- Branch: `feat/yopratiqo-italian-bologna-20261030`
- PR: https://github.com/marcandretheberge-dotcom/Pratiqo/pull/416
- Base commit before this work: `25159f1478ae76193380fae00fa54c62b38298e0`
- Docs evidence commit: `5ced6ec1ec128289594b287ae9d3004fc12fde17` (this report)
- Module selector: `italian-course-a1` (loads course targets + exact Italian dependencies)

## Environment (presence only — no secret values)

| Variable | Present |
|---|---|
| `OPENAI_API_KEY` | yes (`.env.local`) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (`.env.local`) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes (`.env.local`) |
| `YOPRATIQO_AUDIO_BUCKET` | yes → `yopratiqo-audio` |
| `YOPRATIQO_TTS_MODEL` | unset → default |
| `YOPRATIQO_TTS_VOICE` | unset → default |
| `YOPRATIQO_AUDIO_CACHE_DIR` | unset → `.cache/yopratiqo-audio` |

## Provider settings actually applied

- Endpoint: OpenAI Speech API (`/v1/audio/speech`)
- Model: `gpt-4o-mini-tts`
- Voice: `alloy`
- Format: `mp3` / `audio/mpeg`
- No `speed` parameter sent (slow playback is client 0.78×)

## Offline plan

```text
npm run build:yo-italian-course-audio-plan
→ {"distinctTexts":854,"newRecordings":825,"reusedRecordings":29,"newInputCharacters":23254}

npm run generate:yo-italian-course-audio -- --dry-run
→ selected=854, 23649 input characters, unique storage paths, model/voice as above
```

## Canary

`npm run generate:yo-italian-course-audio -- --limit 35` (first 3 were already-present intros; extended canary to reach new paths)

```json
{"selected":35,"generated":28,"cached":0,"uploaded":28,"skipped":7,"verified":35,"failed":0}
```

OpenAI returned valid MP3s; bytes were cached before upload; public URLs verified with SHA-256.

## Full generation

`npm run generate:yo-italian-course-audio`

```json
{"selected":854,"generated":819,"cached":0,"uploaded":819,"skipped":35,"verified":854,"failed":0}
```

Session totals (canary + full): **847 generated/uploaded**, **35 skipped** (already present), **0 failed**.

Local durable cache (not committed): **847 MP3 files**, **40 656 000 bytes**.

## Public verification

`npm run verify:yo-italian-course-audio`

```json
{"selected":854,"generated":0,"cached":0,"uploaded":0,"skipped":0,"verified":854,"failed":0}
```

Sample HEAD checks (public bucket):

| Path | Status | Content-Type | Bytes |
|---|---:|---|---:|
| `.../sentence/buonasera-b84ab2e01d1e.mp3` | 200 | audio/mpeg | 18432 |
| `.../sentence/gli-spaghetti-2716700120a1.mp3` | 200 | audio/mpeg | 29568 |
| `.../sentence/ho-mangiato-80a3039c0632.mp3` | 200 | audio/mpeg | 35328 |
| `yo/it/italian-intro/intro/italian-standard/word/ciao.mp3` | 200 | audio/mpeg | 19968 |

Bucket: `yopratiqo-audio`  
Project host: `jwlbwmxoradmbuvqfkhe.supabase.co`  
Course prefix: `yo/it/italian-course-a1/v1/italian-standard/`  
Also covered: intro (`yo/it/italian-intro/...`) and Bologna (`yo/it/italian-bologna-a1/v1/...`) dependency paths included by the course selector.

## Automated tests / build

- `npm run test:yo-italian` — passed (intro, audio, module, recorded audio, course content/progress/player/audio/navigation)
- `npm run build` — passed

## Browser / pronunciation QA

- **Transport / publication:** verified by public GET + MP3 frame/hash pipeline for all 854 expected paths.
- **In-course UI playback** (normal, 0.78×, stop, mutual exclusion) must be rechecked on the PR preview after this commit deploys to `/yo/langues/italien/parcours`.
- **Linguistic listening QA** (double consonants, `gli`/`gn`, `c/ch`, `g/gh`, stress, numbers/prices, passato prossimo): **not claimed as completed** in this report. Automated HTTP/MP3 checks do not prove pronunciation quality.

## Safety notes

- No `--force` global overwrite.
- Cache and `.env.local` remain outside Git.
- No secrets written into this document.
- Other languages’ audio libraries were not regenerated.
