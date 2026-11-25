# Premium course recordings

## Published bundle — 2026-11-25

This release contains **255 new generated MP3 recordings**, covering eight
languages across nine locale keys. They use stock ElevenLabs v4 voices through
CreativeClaw. They have passed exact-script comparison against independent
Scribe transcription, bounded silence-based segmentation, full decoding,
duration checks and SHA-256 verification. **These checks do not certify native
pronunciation or a regional accent; no human/native listening approval is claimed.**

The files are served from
`public/audio/yo/premium/{locale}/{sha256}.mp3`, totaling 6,559,441 bytes and
402.625 seconds. The registry contains only the corresponding reviewed files.
It contains no planned paths for the 15 rejected Italian lists. A runtime
request cannot start generation or spend provider credits.

Players import a compact exact-text/path index (23,629 bytes for this bundle),
not the 136 KB provider metadata ledger. After any reviewed registry update, run
`node --import tsx scripts/sync-yopratiqo-audio-index.ts`; this is offline and
does not generate or upload audio. The existing capped Realtime publication
tool also updates this index after public-byte verification. File and player
tests check that the index exposes exactly the reviewed recordings.

| Locale | New MP3 files |
| --- | ---: |
| Canadian English `en-CA` | 30 |
| Québec French `fr-CA` | 30 |
| Spanish introduction `es-MX` | 13 |
| Spanish interest practice `es-419` | 12 |
| Italian `it-IT` | 61 |
| German `de-DE` | 27 |
| Brazilian Portuguese `pt-BR` | 26 |
| Japanese `ja-JP` | 28 |
| Mandarin `zh-CN` | 28 |
| **Total** | **255** |

Locale keys identify the requested curriculum language and variety; they are
not accent certifications. Exact source-to-file evidence is in
[`yopratiqo-premium-recordings-provenance.json`](./yopratiqo-premium-recordings-provenance.json).
It records source batch hashes, model and stock voice identifiers, generation
and ASR job identifiers, transcript comparisons, explicit spoken-equivalence
exceptions, timing boundaries, padding, file hashes and decode results.
Temporary workstation paths and signed download URLs are excluded.

## Current curriculum coverage

The current workflow inventories the seven shared introductions, the actual
personalized Italian curriculum and all eight interest-practice corpora. It does not substitute older manifest counts
for the phrases shown in today's lessons. Its default is an offline plan:

```sh
npm run generate:yopratiqo-audio
npm run generate:yo-premium-recordings -- --scope introductions --dry-run
npm run generate:yo-premium-recordings -- --scope italian-current --dry-run
npm run generate:yo-premium-recordings -- --scope interests --dry-run
```

After adding the verified bundle, the offline plan on 2026-11-25 reports:

| Lesson scope | Distinct phrases | Existing mapped paths | Missing recordings |
| --- | ---: | ---: | ---: |
| English introduction | 19 | 19 | 0 |
| Québec French introduction | 19 | 19 | 0 |
| Spanish introduction | 19 | 19 | 0 |
| German introduction | 19 | 19 | 0 |
| Brazilian Portuguese introduction | 19 | 19 | 0 |
| Japanese introduction | 19 | 19 | 0 |
| Mandarin introduction | 19 | 19 | 0 |
| Current Italian course, placement and Florence phrases | 836 | 821 | 15 |
| Interest practice, eight languages | 96 | 96 | 0 |
| **Total within the listed scopes** | **1,065** | **1,050** | **15** |

The original 785 distinct mapped MP3 objects passed delivery/format checks on
November 24; this does not certify natural pronunciation. Interest practice reuses
two exact Italian phrases; both objects were downloaded and decoded again during
the preceding release. The new bundle supplies the other 94 interest phrases. The combined
offline plan deduplicates requests by locale and normalized script. German and Portuguese extended courses also have bundled
recordings; these are separate from their newer shared introductions. Eight
Italian strings safely reuse existing recordings after NFC, punctuation, case
and whitespace normalization within the same language and accent. Lesson text
is unchanged.

`lib/yo/audio/premiumPublished.json` contains the 255 bundled paths. Matching
uses the exact locale and NFC-normalized script, with surrounding whitespace
removed. The URL resolver accepts only a canonical, hash-matching path present
in that registry. It resolves these local files before checking Supabase
configuration. Unknown, altered or traversal-like paths in the premium
directory return no audio URL. The introduction player also applies this check
instead of bypassing it through its legacy local-file shortcut.

The Italian course, shared introductions and interest practice use the same
registry. Existing Storage recordings retain their existing resolution and
configuration requirements. The existing unavailable-audio behavior remains
available; a failed or merely requested playback never counts as listening.

### Rejected sources and limits

Independent ASR found that 15 slash-separated Italian lists actually pronounce
the separator as “barra.” Those sources are excluded, and their lesson strings
remain missing in the offline plan. There is no substituted file, guessed path
or silent rewrite of the curriculum. A later editorial correction and new
recording require their own review.

The accepted comparisons allow only the explicitly recorded numeric expansions
and spoken equivalents in the provenance. Examples include a silent feminine
French `e`, the same Japanese name written in hiragana or katakana, and the
specific Mandarin name `林月`/`林悦`. This is not fuzzy matching or permission to
drop negation, change numbers or replace arbitrary characters.

Each cut requires one measured silence near the end of the preceding ASR word
and before the next utterance. Generator start times may corroborate an ASR
start that includes a long pause; generator end times do not select boundaries.
An ambiguous or absent silence is held for review. The clips include at least
100 ms before and 150 ms after the utterance, adding digital silence only where
an outer source boundary lacks enough padding. The independent boundary review
left all 255 final file hashes unchanged.

ASR confidence is preserved for review, not presented as a pronunciation score.
Three exact-text matches have a minimum word confidence below 0.8: French
`J’ai vingt et un ans.`, the Italian Nina/Montréal/Bologna dialogue, and Japanese
`二十歳です。`. These and the other recordings still need human listening before
making any claim about naturalness or a native regional accent.

## Separate offline Realtime generator

The repository's optional generation workflow uses OpenAI Realtime
`gpt-realtime-2.1`, voice `marin`, minimal
reasoning effort, one context-free audio response, a 1,024-token output ceiling,
and PCM at 24 kHz. Accent instructions come from the existing locale profiles.
The provider's transcript must match the intended script: case, punctuation and
spacing may differ, but words, negation, accents and numbers may not. A human
must still listen for natural pronunciation, pacing and the requested regional
accent; a matching transcript alone does not certify these qualities.

The old general generator remains available for historical manifest verification
and cached provenance. Its older module-specific npm generation commands are
legacy operations. Realtime gap filling uses the commands in this document;
the bundled ElevenLabs recordings above were produced separately and do not
claim a Realtime request hash. Their source batch hash is recorded instead.
OpenAI's text-to-speech documentation lists `tts-1`, `tts-1-hd` and
`gpt-4o-mini-tts` for shutdown on 2027-01-06; changing the model name on the old
`/audio/speech` request is not a migration to Realtime.

Primary references checked on 2026-11-24:

- [OpenAI text-to-speech migration guidance](https://developers.openai.com/api/docs/guides/text-to-speech)
- [Realtime conversation and voice options](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [Realtime client event contract](https://developers.openai.com/api/reference/resources/realtime/client-events)
- [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

## Explicit live batch

The operator needs server credentials `OPENAI_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the existing
`YOPRATIQO_AUDIO_BUCKET` configuration if customized, and FFmpeg. Credentials
belong in the server environment and are never placed in the browser bundle.

An example deliberately limits a first listening sample to eight items:

```sh
npm run generate:yo-premium-recordings -- --generate --scope all --limit 8 --budget-usd 1
```

The budget argument is a cumulative ceiling for this recording cache, not an
estimated charge and not a reset on each invocation. It must be positive and
at most USD 10. This offline recording ledger is separate from the database
ledger for the live speaking pilot; their caps must not be described as one
combined provider-account limit. No recording runs on installation, import,
build, deployment or CI. This release did not invoke this OpenAI generator;
the 255 bundled files came from the separately authorized CreativeClaw batches.

Before each paid request, the tool writes a conservative reservation and an
attempt marker under `.cache/yo-premium-recordings/`. Known usage can release
unused reservation; an unknown failure keeps the full reservation. The batch
stops at the first error and never retries an ambiguous paid request on its
own. Do not delete the cache or ledger to bypass a ceiling. Review provider
usage and the cached evidence before deciding how to resolve an interrupted
attempt. A missing ledger in a nonempty cache is rejected.

## Realtime publication and listening review

Each successful source is cached with its exact request, transcript evidence
and PCM hash. A storage failure can resume from the same validated source
without another provider call. The publication sequence is:

1. Validate the transcript, non-silent PCM, duration and bounded usage.
2. Encode a valid MP3 with FFmpeg and check the resulting duration.
3. Upload to a new versioned object path with replacement disabled.
4. Download the public object, validate the MP3 and compare its SHA-256.
5. Write the verified path and provenance into the registry.

For bundled files, review the checked-in bytes and registry together; their
filename must equal the MP3 SHA-256 and the automated file checks must pass.
The deployment serves these files directly. Production delivery verification
belongs to the release, rather than being inferred from a local file check.

Listen to samples in all eight languages, including Québec French, Brazilian
Portuguese and the intended Spanish variety, before treating a generated batch
as premium. Check all missing items are covered with another offline plan, and
commit the reviewed registry through the normal PR process. A provider error,
an unexpected response ID, a changed script, a bad file or a different public
hash leaves the registry unchanged.

## Verification

```sh
npm run test:yo-premium-recordings
node --import tsx tests/yo/yopratiqoPremiumPublishedAudio.test.ts
node --import tsx tests/yo/yopratiqoPremiumAudioPlayback.test.tsx
```

The suite exercises actual curriculum planning, accent-safe reuse, fragmented
provider streams, response isolation, request and usage caps, exact-script
validation, explicit budget enforcement, interrupted attempts, storage failures,
public-file integrity and publication. The two bundled-audio suites verify all
255 hashes and MP3 frame streams, exact coverage and provenance, reserved-path
rejection, playback without Supabase, the actual intro/Italian/interest
resolvers, listener lifecycle and rejected-list exclusion. They run without
keys or paid calls.
