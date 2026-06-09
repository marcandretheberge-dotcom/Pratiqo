# Teacher Learning Summary Effectiveness

Status: architecture foundation only. No teacher-sharing workflow is live from this document.

## Principle

Teachers need actionable summaries, not raw data. A useful bridge should help a teacher prepare the next lesson without exposing private learner telemetry by default.

Raw quiz answers, raw option selections, keystroke history, audio attempts, and detailed activity logs should stay private unless a future consent model explicitly allows a more detailed report. The default should be summary only after consent.

## Summary Contents

A teacher-ready learning summary should include:

- completed modules
- final challenge result
- strengths
- needs practice
- suggested lesson plan
- suggested homework
- optional companion growth status
- date generated

The summary should not include raw quiz answers by default.

## Consent Levels

- Private: learner progress stays inside YoPratiqo and student-facing Pratiqo surfaces.
- Summary only: teacher sees a short pedagogical summary after explicit consent.
- Detailed report: future option requiring separate consent and privacy review.

Default: summary only after consent.

Consent should be scoped by teacher, booking, module, and duration where possible. Revocation must prevent future sharing, while historical summaries may require a separate retention rule.

## Example: Spanish Module 5

Scenario: learner completes a final travel challenge after the Dominican Republic Spanish path.

Teacher summary:

- Completed modules: Intro, arrival, food, directions, cultural conversation.
- Final challenge result: 78%, passed.
- Strengths: greetings, travel vocabulary, culture.
- Needs practice: listening repetition, scenario response, pronunciation.
- Suggested lesson plan: start with hotel check-in roleplay, then restaurant ordering, then one open conversation about travel plans.
- Suggested homework: record three spoken answers or write five travel questions.

Do not share the learner's raw quiz choices or every failed item.

## Future Japanese Example

- Completed modules: writing-system intro, greetings, politeness basics.
- Final challenge result: 72%, passed.
- Strengths: kana recognition, greetings.
- Needs practice: particles, polite-form sentence building.
- Suggested lesson plan: short greeting drill, particle contrast, then polite self-introduction.
- Suggested homework: recognize ten hiragana and write three polite sentences.

## Future Korean Example

- Completed modules: Hangul basics, greetings, polite endings.
- Final challenge result: 69%, needs review.
- Strengths: Hangul recognition, routine greetings.
- Needs practice: particles, pronunciation awareness.
- Suggested lesson plan: Hangul sound review, polite endings, then a simple cafe dialogue.
- Suggested homework: read five Hangul syllables and repeat two polite endings.

## Future Chinese Example

- Completed modules: pinyin orientation, tones, basic word order.
- Final challenge result: 74%, passed.
- Strengths: pinyin recognition, basic vocabulary.
- Needs practice: tone awareness, measure words.
- Suggested lesson plan: tone pair practice, measure-word examples, then short ordering scenario.
- Suggested homework: identify tones in five words and build three noun phrases.

## Effectiveness Rules

- Summaries should be short enough for a teacher to read before a lesson.
- Recommendations must be concrete and teachable.
- Low-signal summaries should say so instead of pretending certainty.
- No AI-generated narrative is required for launch; deterministic tags and challenge results are enough.
- Teacher sharing requires learner consent.
- React Native clients should consume the same summary contract as the web app.
