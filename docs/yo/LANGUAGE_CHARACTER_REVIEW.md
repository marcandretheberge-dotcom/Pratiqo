# Language-specific characters and questions

Follow-up to the founder's review of #437: the shared experience must not read as the same lesson with translated words and repeated names.

## Content changes

Each of the seven new introductions now has its own four fictional characters:

- English: Emily, James, Oliver, Charlotte; a Toronto language exchange.
- Quebec French: Émilie, Félix, Étienne, Camille; a Montréal community workshop.
- Spanish: Lucía, Mateo, Diego, Valentina; a cultural meetup in Montevideo.
- German: Lena, Lukas, Felix, Hannah; a language class in Berlin.
- Brazilian Portuguese: Beatriz, João, Rafael, Mariana; a creative workshop in São Paulo.
- Japanese: はるか / Haruka, けんた / Kenta, たくみ / Takumi, あおい / Aoi; a polite first meeting in Tokyo.
- Mandarin: 林悦 / Lín Yuè, 陈明 / Chén Míng, 李伟 / Lǐ Wěi, 王芳 / Wáng Fāng; a Beijing campus meeting.

Names are authored in the actual source JSON, including the spoken target sentence, translations, sentence tiles, fictional profile labels, grammar references and vocabulary bank. Japanese and Mandarin retain their native scripts and reading aids. Names do not determine a character's nationality or appearance; stated origins remain explicit role-play data.

Each language has 3 authored mission titles/goals and 9 contextual question prompts, with FR/EN/ES interface translations: 63 revised practice prompts, not 63 newly added exercises. Final questions inherit the relevant revised wording. The other prompts and learning objectives stay shared. This is a content variation pass, not new exercise mechanics or a new syllabus.

## Compatibility and boundaries

Stable phrase/exercise IDs, answer semantics, options, exercise order, word-tile counts and progression rules are retained. No reset, new reward, paid access change, learner data write, artwork change or Expo build is included. Italian and existing later courses are unchanged. The existing recording resolver matches the updated phrase text; it must not play an old recording naming Nina/Anna/Nora for the replacement. New name recordings were not generated, so the existing device-voice limitation remains.

## Verification

`tests/yo/yopratiqoLocalizedCharacters.test.ts` adds 23 checks covering the seven casts, native-script readings, consistent phrase/card/bank references, 63 distinct contextual prompts, translated copy, final-question propagation and stable assessment structure. It runs in the existing shared-language review workflow alongside previous content, player and browser regression suites. Read the actual run before reporting its outcome. This change stays in the draft test-preview branch, not production.
