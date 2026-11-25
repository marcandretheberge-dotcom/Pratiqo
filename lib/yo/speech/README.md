# Bounded Yo speech pilot

The browser sends a consented, mono PCM16 24 kHz recording (maximum 15 seconds) to a Node route. A server-owned Realtime WebSocket produces one short audio reply and a separate, text-only feedback response. No API key or ephemeral Realtime credential reaches the browser. There is no browser-recognition fallback and no persistent live provider session.

## Activation dependencies

- Apply `supabase/migrations/20261125020143_yo_speech_bounded_practice.sql` with the normal reviewed migration workflow first.
- Server environment: `OPENAI_API_KEY`, `YO_SPEECH_ENABLED=true`, `SUPABASE_SERVICE_ROLE_KEY`.
- Existing Supabase environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Node runtime dependency: `ws`. Outbound server WebSockets to `wss://api.openai.com/v1/realtime` must be permitted.
- Same-origin microphone Permissions Policy on the practice pages, HTTPS, and an AudioWorklet-capable browser.
- Production service_role cannot SELECT `auth.users` (verified read-only). The sole SECURITY DEFINER function, `yo_speech_account_available(uuid)`, returns only a boolean account-eligibility check with an empty search_path, qualified references and service-only EXECUTE. All mutation RPCs use SECURITY INVOKER. The migration adds no broad auth-table grant.

No secret value belongs in the repository, public env, logs, tests or this document. Missing configuration/schema/credentials fails closed. `GET /api/yo/speech/status` provides honest availability. A disabled provider does not remove saved phrase reviews.

## Monetary and duration limits

Amounts are integer USD micro-units. One reservation is 200,000 microUSD ($0.20), never refunded, including provider errors, aborts, uncertain completion, stale reservations and account deletion. A single locked budget row independently limits the pilot to 10,000,000 microUSD ($10). Fifty reservations exhaust it. There is no client/env override or automatic reset. A user has at most ten reservations (300 reserved seconds), one in flight and three starts per minute. The UI reports short turns remaining rather than claiming exact conversational time.

Each turn permits two responses, each with `max_output_tokens=256` and `reasoning.effort="minimal"` for this simple scenario; automatic turn detection and tools are disabled. The first uses the bounded audio input. The second uses `conversation: "none", input: []` and text output so it cannot rebill the audio history. Prompts are at most 12,000 UTF-8 bytes each. A conservative budget includes 2,048 tokens of extra context per response, 128 extra input audio tokens and prices every output token at the highest audio rate:

```
2 * (12,000 + 2,048) * 4          = 112,384 microUSD (text input)
(150 + 128) * 32                 =   8,896 microUSD (audio input)
2 * 256 * 64                    =  32,768 microUSD (both output caps)
15 seconds * 75                 =   1,125 microUSD (transcription)
Total                           = 155,173 microUSD (< 200,000 reserved)
```

This bound is based on the documented pricing and input tokenization below, with a margin for overhead. Runtime usage is also validated. Unexpected token accounting/output size, additional responses, or cost above the reservation trips a persistent database circuit breaker. Reservations remain counted if reporting itself fails. The $10 ledger covers these live practice requests; offline recording-generation jobs need their own explicit budget and do not silently share/refill this ledger.

## Feedback, privacy and review

All eight targets are supported: Italian, Japanese, neutral Latin American Spanish (`es-419`), Quebec French, Canadian English, German, Brazilian Portuguese and Mandarin. Spanish follows the scenario without imposing a country or forced regional slang, so it remains suitable for both the Montevideo introduction and Dominican course exercises. These are language instructions, not a guarantee of a particular native accent or dialect. Scenario IDs are `introduction`, `cafe`, `directions`, `hotel`, `workplace`. Interface and explanatory feedback languages are French, English and Spanish.

Transcripts are approximate. Feedback is about word choice, grammar and meaning, never a fabricated phonetic, accent or pronunciation score. A correction must quote a nonempty normalized excerpt from the actual transcript. No recording, complete transcript or dialogue history is stored in Pratiqo's database. OpenAI receives the recording and bounded context after explicit mic opt-in. The browser holds the current exchange in memory only.

Saving derived phrases is a separate, unchecked opt-in. Only a short corrected phrase, hint, language, locale and SRS state are persisted in `yo_error_events`. It uses the existing pure `recordAttempt` engine through a separate adapter, without injecting foreign IDs into the Italian course queue or activating unrelated daily/SRS flags. User ownership always comes from validated authentication. Review updates use a revision compare-and-swap plus an attempt receipt. No course completion, XP or Pass entitlement is granted. A saved phrase can be deleted.

The disclosure lazy-mounts the practice. No status query or microphone request happens before opening. The microphone additionally requires consent and an explicit record gesture. Closing/unmounting, account change, page hiding, hidden/inert course ancestors, cinema opening and speech cancellation stop capture, voice requests and playback. Media are coordinated with the existing lesson stop events.

## Verification and remaining live gate

Run:

```
node --import tsx tests/yo/yopratiqoSpeechDatabase.test.ts
node --import tsx tests/yo/yopratiqoSpeechProvider.test.ts
node --import tsx tests/yo/yopratiqoSpeechApi.test.ts
node --import tsx tests/yo/yopratiqoSpeechClientLifecycle.test.tsx
```

These exercise real PostgreSQL semantics via PGlite, event-level provider fixtures, route execution, and independent DOM lifecycle tests. They do not prove a live OpenAI round trip. The production migration `20261125020143` was applied on 2026-11-24 at 21:01 Toronto time; its service-only grants, RLS and zero-used USD 10 budget were verified. The implementation session had no OpenAI key and did not make a live provider call. Before activation, verify a controlled turn in each of the eight target languages, model/events/audio/transcript, actual usage against its reservation, cancellation and account isolation. Do not label this gate as passed without that evidence. The full activation and eight-language QA record is in [the product runbook](../../../docs/product/yopratiqo-speech-practice.md).

## Official sources checked on 2026-11-24

- https://developers.openai.com/api/docs/pricing — Realtime 2.1 text input/output $4/$24 per 1M tokens, audio $32/$64.
- https://developers.openai.com/api/docs/models/gpt-realtime-2.1 — supported model and rates.
- https://developers.openai.com/api/docs/guides/realtime-conversations — PCM24k, manual append/commit, out-of-conversation responses and audio events.
- https://developers.openai.com/api/reference/resources/realtime/client-events — session/response output caps and GA configuration.
- https://developers.openai.com/api/docs/guides/realtime-transcription — `gpt-transcribe`, `languages: [...]`, completed transcript correlation by item ID.
- https://developers.openai.com/api/docs/models/gpt-transcribe?site_locale=en — $0.0045/minute, or 75 microUSD/second.
- https://developers.openai.com/api/docs/guides/voice-latency-cost?voice-api=realtime — audio input 10 tokens/sec; output 20 tokens/sec; context billed per response.
- https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create — older Speech API models retire January 6, 2027; this implementation uses Realtime.
