# Italian Unit 1 — interest-based reference edition

November 27, 2026. Scope: the first Italian unit, with the existing twelve-unit
course kept available. This release does not establish an A1/A2 certification or
claim full-course personalization in every language.

## Learner experience

The six existing choices remain music, art, history, sport, food and nature.
Learners may choose up to three. Their chosen subjects populate the three main
lesson slots, each with a factual discovery, vocabulary, language explanation,
comprehension and listening work, guided practice, and an open personal response.
All selected subjects appear in the main plan; array order does not establish a
primary/secondary preference. An empty selection retains the general course.

| Subject | Concrete content |
| --- | --- |
| Music | Cremona violin making, materials, makers and musicians |
| Art | The Arco lamp, its function, materials and designers |
| History | The Colosseum, its function and the origins of its names |
| Sport | The Rome Olympics in ancient venues and the Olympic rings |
| Food | The Neapolitan pizza craft, ingredients and four phases |
| Nature | Gran Paradiso, the ibex, habitats, valleys and regions |

The reference bank contains eighteen immutable lessons and 126 guided exercises.
One selected plan uses three lessons and 21 exercise slots. The language targets
remain names and identity; origin, location and singular articles; numbers
zero to twenty and requests for repetition. One shared six-question check-in
uses the same pass requirement for every combination of subjects.

Sources and supported factual claims are linked in each discovery. The Italian
texts are original teaching adaptations, and practice conversations are labelled
fictional. They are not presented as quotations or archival recordings.

## Narration and educational video

- 36 recorded passages: eighteen discoveries and eighteen short listening models.
- Selected voice: Violetta, `gfKKsLN1k0oYYN9n2dXX`, model `speech/elevenlabs-v4`.
- Six illustrated educational videos, one for the first lesson in each subject,
  with the exact discovery narration, Italian captions and a poster.
- Short listening models also serve their matching dictation prompts and exact
  spaced-review activities. Other course utterances retain their existing audio
  resolution and device speech fallback; this is not a complete re-recording of
  every word, instruction or dialogue.

`lib/yo/audio/italianInterestPublished.json` records exact scripts, voice/model,
source jobs, source hashes, delivered MP3 hashes and duration. The compact
`italianInterestIndex.json` provides the browser's exact-text lookup. Only those
published paths can use bundled audio delivery.

The already generated batches were segmented using native word timings and
checked against independent Italian transcriptions. Historical years are spoken
in full and displayed as dates. Format and transcript verification do not certify
a native regional accent; the manifest keeps `nativeAccentReviewed: false`.

`scripts/publish-italian-interest-audio.py` packages existing generated batches;
it makes no generation requests. `scripts/render-italian-interest-videos.py`
renders the original diagrams and captions from that approved-voice manifest.
Neither script is part of the production build.

## Continuity and assessment

Content IDs include an immutable edition, interest and lesson slot. A lesson is
pinned when it starts. Future unstarted slots may change with preferences, while
an open mission retains its content and catalog until the learner returns to the
map. Resumable drafts carry the exact step and assessment identities.

Learners who already began either earlier Unit 1 edition retain that complete
edition and its assessment. Explicit review links resolve the original lesson
and exercise, including a previously selected interest. Review content does not
silently replace the current plan. Printed vocabulary and check-in summaries
carry the exact three-lesson edition.

The progress catalog validates retained content without displaying all eighteen
bank lessons as required work. Passing the selected Unit 1 check-in continues to
unlock Unit 2, including from the daily learning home.

The server grades the exact activity. The 126 variants map to 21 equivalent XP
reward slots before using the existing atomic award operation, so changing
subjects does not multiply rewards. Exact activity IDs remain in the review and
learning history; the existing XP ledger stores the reward slot identity.
No database migration accompanies this release.

## Personal production and tutor bridge

The open writing response is a local draft. An optional short microphone
recording remains private in the current page and is discarded when that
component closes; it is not uploaded or automatically graded. A tutor brief can
be previewed and deliberately copied. Including the personal writing draft is a
separate choice. The Italian tutor link uses the existing marketplace; no shared
interest, availability or appointment duration is invented. A paid booking is
not required to continue learning.

## Remaining curriculum work

The other eleven Italian modules and the other seven language adaptations remain
in the full-course brief. This reference edition does not implement the proposed
Unit 6/12 proficiency rubrics, consolidation sprints, AI speech assessment or an
automatic booking-to-teacher handoff. Those features need their own authored
content and explicit behavior before being presented to learners.
