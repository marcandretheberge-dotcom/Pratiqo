# Italian Bologna — prerecorded audio

## Target

- Supabase project: `jwlbwmxoradmbuvqfkhe`.
- Public URL: `https://jwlbwmxoradmbuvqfkhe.supabase.co`.
- Existing public bucket: `yopratiqo-audio`.
- New module selector: `italian-bologna-a1`.
- Immutable prefix: `yo/it/italian-bologna-a1/v1/italian-standard/`.
- New recordings: 48, with 955 input characters in the current offline plan.
- Reused recordings: 8 exact matching Italian-introduction texts. Their provenance is explicitly unattributed; the configured model is not proof of how an old file was generated.

The compact `italianBolognaAudio` registry is a recording plan. `italianBolognaReusedAudio` references already uploaded intro paths; the new batch must not overwrite or duplicate those files. A coverage test walks the authored Italian targets and checks the lookup.

## Execute in Cursor or another trusted Node environment

Use existing ignored environment configuration for `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`. Set `YOPRATIQO_AUDIO_BUCKET=yopratiqo-audio` if a bucket override is used. Secrets configured only for Supabase Edge Functions do not reach the local Node process.

Never expose the privileged keys in browser variables, source files, logs, command-line arguments or reports. No new Edge Function or RLS policy is required for this generator.

```powershell
npm run generate:yo-italian-bologna-audio -- --dry-run
npm run generate:yo-italian-bologna-audio -- --limit 3
npm run generate:yo-italian-bologna-audio
npm run verify:yo-italian-bologna-audio
```

The dry run is offline. `--limit 3` selects the first three manifest entries, including ones already present. Use the limited batch to inspect the actual voice before continuing.

The existing integration defaults to OpenAI `POST /v1/audio/speech`, model `gpt-4o-mini-tts`, Italian profile voice `alloy`, `response_format: mp3`, and `audio/mpeg` uploads. `YOPRATIQO_TTS_MODEL` and `YOPRATIQO_TTS_VOICE` can override the defaults; record the actual configuration in the generation report. The code sends no `speed` parameter. Confirm the current provider API contract before changing the integration.

The cache `.cache/yopratiqo-audio/` is ignored by Git. Keep it and its provenance until public-byte verification succeeds. Upload retries reuse the cached MP3. Existing objects are verified/skipped by default. Do not run a blanket `--force`: it permits replacement and can still reuse cached bytes. A revised voice request should receive a new immutable path/version to avoid stale CDN audio.

Verification fetches every expected new public URL and checks MP3 frames and, when provenance exists, byte hashes. It needs only the public URL and makes no OpenAI or upload request. Check the eight reused paths separately as recorded in the verification report.

## Release evidence

Before marking audio complete, verify **48/48 new recordings plus 8/8 reused recordings**, zero failures. Record actual model/voice, time, object path, byte count and SHA-256 without secrets. Test actual browser playback in vocabulary, a dialogue, listening, map instructions, café and Yoppo examples. Review short Italian words, accented syllables, numbers and sentence endings by listening; transport checks do not establish pronunciation quality.

If a key is missing, report the variable name and required runtime. Do not describe the manifest, a dry run, a mocked player or an unavailable URL as a published recording.
