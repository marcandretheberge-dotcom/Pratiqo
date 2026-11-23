# YoPratiqo: release scope and first premium experiment

## This release

- Public: three or more maps per primary language path. The Italian course uses the illustrated twelve-city itinerary on the existing real routes. Existing course evidence, placement access and optional practice still decide where a learner may enter.
- Private: personal XP, daily goals, passport sounds, practice postcards and a **fictional** weekly ranking remain in the isolated review experience. Do not point customers there or promote review storage into live learning evidence.
- No change to paid access, prices or free retries. No database migration, new AI key or API calls are needed. Reverting the application change is sufficient; retain course progress.
- Web release is not an App Store release. Physical Safari, offline pack coverage and device-to-device continuity are separate verification items.

## What to build next, in order

1. **Make personal progress trustworthy.** Use confirmed exercise evidence and dated, idempotent awards; distinguish a historical achievement from a success today. Test reload, two devices and an offline retry before offering public comparisons. Rankings should be optional, use safe display names and never compare real learners with fictional ones.
2. **Sell a useful outcome, not points.** Pilot an Italian train-station rehearsal: read a departure board, ask for the platform, then handle a platform change. Yoppo gives one specific hint and lets the learner retry a different version. Try a new equivalent task without hints the next day. Offer an optional free practice prompt at the Café or the existing marketplace link to a teacher. Do not send transcripts or messages to either.
3. **Test willingness to pay before expanding.** Let learners try one scenario free; test demand for a one-time trip pack. Keep existing lessons/retries free on their present terms. Measure pack impressions, independent next-day successes/attempts, returning learners/entrants, actual purchases/offers shown, refunds and contribution after model and human review costs. An interest click is not a purchase. No pricing or checkout change in this release.

## Proposed monthly API envelope (USD; not spending authorization)

| Ceiling | Experiment | Control |
| ---: | --- | --- |
| 40 | Draft variations and illustrated scene briefs for reusable offline missions | Batch ahead of time; language-editor sign-off, bundle approved content |
| 25 | Generate specific hints for common errors and equivalent delayed practice | Human-reviewed answer key; no automatic changes to progression |
| 15 | Evaluate ambiguity, duplicate questions and quality of corrections | Fixed reference set; test unseen cases and report failures |
| 20 | Unallocated reserve | No jobs against reserve by default |

Start with a single USD 10 pilot **within**, not in addition to, the envelope. Confirm the grant balance, receiving organization, expiry and any other spend first. Start with authored material only: no learner names, messages, voices or identifying data. Keep API credentials server-side. Before enabling any recurring or live model use, reserve the worst-case cost before requests, including retries and concurrent work; refuse calls when the smaller of the remaining grant or application budget is reached. A provider alert is not a hard cutoff. Use a bundled fallback offline and at the cap. A subsidy is not proof the product is profitable at full API price.

Sources: [API credit benefit](https://help.openai.com/en/articles/20001626-api-credits-benefit-for-eligible-chatgpt-subscriptions), [Batch API](https://developers.openai.com/api/docs/guides/batch).
