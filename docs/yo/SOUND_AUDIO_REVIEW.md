# Sound experience and audio review — 2026-11-08

## Scope
The approved two-note soft-wood answer sound is preserved. Distinct original quiet wooden cues now cover explicit Yoppo movement from the map, completed missions, stamps and an actual newly unlocked Italian stage. Errors remain visually informative and silent. No copied game audio, no new background music, no claim of traditional music or native Expo haptics.

Tools include an independent effects-volume slider, the existing mute and vibration switches, and collapsed audition controls for each new cue. Pronunciation is not muted by the effects switch. Trusted pointer/keyboard gestures prepare the audio context silently so an automatically reached reward can play. Sounds never grant scores or unlock access.

The seven shared introductions emit movement, mission and stamp cues. The guided Italian player emits movement, mission and stamp cues; a first passing result can emit a separate quiet unlock cue when returning to the map, only if the next stage is actually unlocked. Reloads are silent and no learner-progress schema has changed.

## Playback repair
The shared pronunciation player has a single cancellable session: recorded audio first, then an appropriate installed device voice after recording failure or a bounded loading/stall timeout. Missing Mandarin never becomes Cantonese; Quebec French and Brazilian Portuguese retain their regional requirements. Delayed voice availability is handled. No listening evidence is emitted merely by clicking Play or receiving an error.

Stop works while a file is still loading. Page hiding, route cancellation, unmount and speed changes release the pronunciation lock. Normal and slow playback use the same recording with preserved pitch. Italian device fallback shares this lifecycle; already available Bologna recordings are now used even without a provider projection. Existing Italian MP3-player behavior is retained.

## Read-only inventory findings
Audit run 42484709601 checked 1,958 unique registered audio paths: 1,957 valid MP3s and one HTTP 400, the combined Quebec marker Tiens / Tenez. These are availability/structure checks, NOT certification that every phrase was listened to or its pronunciation reviewed by a native speaker.

The seven introductory modules contain 133 expressions; 23 have matching existing recording paths and 110 rely on the device voice. The Italian first-module inventory contains 95 distinct spoken targets including its bank; 21 match existing paths and 74 lack dedicated recordings. Later Italian units have matching paths for the inventoried targets. No new paid speech generation was run, and no audio coverage gaps are relabelled as completed.

## Audited broken asset
The missing combined marker is replaced at URL resolution by a bundled MP3 assembled from the exact existing Tiens. and Tenez. recordings with a short pause. Source and output hashes are in QUEBEC_AUDIO_REPAIR.json. This reuses the same two pronunciations without new TTS; it does not write to Supabase or pretend the missing original object was restored. The raw legacy-path audit still documents that historical missing object; resolved playback and the bundled file are tested separately.

## Validation boundaries
New lifecycle tests cover actual playing versus requested play, recording errors, buffering, delayed/missing voices, safe dialect selection, stop/hidden/unmount and slow replay. Feedback tests cover finite/distinct waveforms, volume, mute, queuing, cancellation, gesture preparation and silent restore. Seven rendered shared journeys verify exactly three mission cues, one movement cue and one stamp, unchanged 250-point completion and no replay on reload. Existing Italian player/scoring and tap-flow tests are retained.

The old link-only byte guard was updated for these explicitly requested sound hooks: canonical progress, placement and scoring modules must remain byte-for-byte unchanged from published 5d7edc9. Tests are not a substitute for physical iPhone/Android listening. Device recordings, cultural map music and native app audio/haptics remain distinct unfinished work. Deployment status must be checked in the PR and Vercel; this document does not assert production publication.
