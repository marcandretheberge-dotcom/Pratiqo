# Priority recording queue for four YoPratiqo foundations

Run the read-only inventory from the repository:

```sh
node --import tsx scripts/plan-yo-foundation-recording-gaps.ts
node --import tsx scripts/plan-yo-foundation-recording-gaps.ts --queue
node --import tsx tests/yo/yopratiqoFoundationRecordingGaps.test.ts
```

This narrower, prioritized queue covers recurring lesson controls that learners
notice first: dialogue lines, vocabulary, and grammar examples. Each exact
phrase is listed once per language, ordered by first unit, with every unit and
surface that uses it. Counts are registration evidence only, not an HTTP test
or a pronunciation assessment.

| Foundation | Registered | Missing | Total |
| --- | ---: | ---: | ---: |
| German | 100 | 118 | 218 |
| Brazilian Portuguese | 100 | 120 | 220 |
| Japanese | 114 | 67 | 181 |
| Mandarin | 124 | 64 | 188 |

The 369 priority gaps are not a total course-audio deficit. This scope excludes
distractor/answer banks, assessments, pronunciation drills, written models,
help, kana, standalone tones, and legacy paths not used by these controls.
No audio is generated or uploaded by this tool; missing phrases do not acquire
placeholder paths. Generation still requires approved provider access, separate
listening and script quality checks, and validation of the deployed recordings.
