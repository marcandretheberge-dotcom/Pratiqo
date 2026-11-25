# First Italian sale rehearsal: web, CAD, test only

**Try it:** ordinary entry `/yo/langues/italien/parcours` → *Mon itinéraire et mes Pass*. The first three Bologna lessons, their recap and the assessed final are free. At Parma, complete its first two lessons and earn 4/5 unassisted in its normal Trivia. The pilot scores the actual answers again on the server. An interrupted or pre-login win can be submitted from the same browser tab after signing in. The two confirmed results live with the test account, not the map or the cosmetic medal. Existing placement/review still works; a local placement preference alone is not payment evidence. A returning learner without verifiable server evidence can replay the free assessments; there is no retrospective charge for existing material.

The map starts in Bologna. Each of the next eleven cities has an optional four-part travel situation, a listening exercise and a replay. Learners can use their five welcome passes on any five earned situations. The sixth distinct redemption creates the first opportunity to purchase. Existing lessons, ordinary course progress and the visual Yoppo Pass trophy keep their existing rules.

| City | Optional situation |
| --- | --- |
| Parma | Catch a train after a platform change |
| Modena | Collect the right book order |
| Verona | Arrange breakfast around a visit |
| Napoli | Order at the counter and check the change |
| Firenze | Give directions to a museum |
| Siena | Choose clothing and confirm the total |
| Venezia | Find the right vaporetto and stop |
| Genova | Change a plan when it rains |
| Torino | Check in and ask for help at reception |
| Roma | Tell a friend about yesterday’s visit |
| Palermo | Retrieve luggage before the depot closes |

| Product | Pre-tax CAD | Test behavior |
| --- | ---: | --- |
| Single unit | 3.49 | One shared pass; free replay after redemption. |
| Explorer | 8.99 | Three account units allocated 300, 300 and 299 cents. |
| Italian Foundations | 19.99 less eligible redemptions | 12 months, one payment, no renewal. All covered Italian stages still require their learning prerequisites. |
| Future bundle | 59.99 | No product, checkout or offer in this pilot. Requires at least four named complete and tested itineraries. |

The desk lists the eleven optional situations, quotes the next stage and calculates the lowest additional spend to cover them all. For a fresh account, five welcome passes plus two Explorer packs cover the itinerary for CAD 17.98 before tax. The CAD 19.99 course preserves all five passes and covers the eleven Italian situations for twelve months. A learner with a pass pays zero today. The separate course quote subtracts eligible, already-redeemed Italian purchase value during the previous 12 months; never welcome passes, unused units or other languages. A pack used entirely on Italy reduces 19.99 to **11.00**. Refunded/disputed units do not contribute. A partial refund freezes the purchase for review rather than pretending to know which unit was refunded. Settled units cannot be credited twice. Progress is separate from access. The pilot treats a redeemed stage as a 12-month access period, pending confirmation of live pass terms.

**Account and payment boundary.** A synthetic, verified local Supabase Auth identity is required. Anonymous and authenticated database roles have no direct table privileges. The server stores an account revision and atomically commits grants, debits, redeemed destination and stage access using compare-and-swap. Read-backs recompute account, order, offer, configured Price, CAD amount, successful test charge and refunds. The test price catalog is versioned and has three separate Price IDs. Test PaymentIntents use a Stripe-supplied test payment method; no real card form is hosted. A declined, unpaid, canceled or unverified intent grants nothing. Repeated delivery is idempotent. The notification endpoint requires a valid signature; local QA signs synthetic deliveries, not an actual externally delivered webhook. Local mode intentionally uses zero tax as a simulation, not a finding about Québec tax obligations.

**Account rights not invented:** no verified shared monetary-pass referral or monthly claim source was found. No pretend claim button; neither the ambassador ledger nor the marketplace credit balance is repurposed. Confirm qualification, five-referral cap, and the non-accumulating monthly grant source before enabling either. No credit conversion, gift, premium bundle, subscription, wrapped-app checkout or legacy Dominican purchase link is used.

## Testing and operation

* [iPhone audio sample (branch preview)](https://pratiqo-git-feat-yo-p-5c203a-marcandretheberge-dotcoms-projects.vercel.app/yo/langues/italien/parcours/pass) · [mobile walkthrough](parma-mobile.webm) · [completion screenshot](parma-mobile.png). The sample never charges a card or creates an account.
* [Napoli listening sample](https://pratiqo-git-feat-yo-p-5c203a-marcandretheberge-dotcoms-projects.vercel.app/yo/langues/italien/parcours/pass?city=u05). Parma uses the historical recordings. For other cities the player uses available course audio or an Italian device voice and offers a readable transcript.
* For isolated audio, set `YO_PASS_RECORDINGS` to the local directory containing the published Bologna pack's two MP3s and run `node --import tsx tools/yo-pass-pilot/seed-audio.ts` once after setup. The app uses its existing audio route and the tool refuses to overwrite mismatching recordings.
* Earlier Parma-only rehearsal: three real Stripe **test** Price objects, successful test receipts for 349, 899 and 1,999 cents, plus an **1,100-cent** upgrade after redeeming the pack. Verified a Stripe test decline and refund, cancellation, two locally signed deliveries for one verified receipt, two concurrent redemption attempts, two account sessions and a separate learner. All eight focused pricing/learning tests, the existing payments suite, and 21 existing guided, personalized and midpoint player checks passed. No live sale or tax determination.

* The ten pricing and learning tests cover all eleven situations, a resumed legacy Parma run, retries, refunds and the first purchase decision after five welcome redemptions. The new multi-city tests run without a Stripe key.
* Install dependencies with `npm ci`. Run `node --import tsx --test tests/yo/yoppoPassPilot.test.ts`. For the isolated rig only, set `YO_PASS_TEST_ENV_FILE` to a local file containing a test key; the tool reads just the test key, not the rest of that configuration. Set up with `node --import tsx tools/yo-pass-pilot/local.mjs setup`, then use `serve` instead of `setup`. The fixed Docker names, network and loopback bindings are verified. Do not run the fixture SQL against a hosted project.
* On the host, open `http://127.0.0.1:55941/yo/langues/italien/parcours/pass`. The ignored local file `.qa-guided/pass-pilot/review-accounts.json` contains disposable credentials. Use **voyage** for five welcome passes; **retour** is a deliberately seeded exhausted balance. Do not post those logins in the PR. Signing in to the same account in a new session does not reissue five.
* `tools/yo-pass-pilot/verify.ts` exercises real local Auth, a fresh second session, account isolation, database restrictions, competing debits, actual Stripe test receipts at all three prices, cancellation, refund and owner-before-checkpoint. The upgrade rehearsal now redeems the three units in Parma, Modena and Verona through the account API. `tools/yo-pass-pilot/mobile.ts` records a Chromium phone viewport through the real UI, with the initial checkpoint answers supplied by the QA harness; the film is not evidence of a physical iPhone test or of a human completing the whole first module.
* The Vercel PR preview route is intentionally an anonymous audio sample, not a live checkout. The account-backed payment API refuses Vercel/hosted production services. Real iPhone/WebKit and live webhook delivery are separate checks. The two Bologna recordings are reused; no new audio or film spend. The existing taxi clip belongs to Venezia; no claim to new Parma opening, artifact or ending footage.

## Before the first real sale

Review the eleven playable situations with pilot learners, confirm pass/grandfathering terms, 12-month digital refund disclosures, Canadian tax registrations/rates, sales channel, and live payment method/SCA behavior. Configure dedicated live SKUs and signed fulfillment with delayed-payment, dispute and reconciliation monitoring only after separate approval. A web test payment is not authorization for an App Store sale. Review physical Safari, alternate-device continuation, localized checkout and production rollback first. Disable the feature on rollback; preserve the ledger and receipts.

**Measurement:** do not infer a sale from a video view, click, test charge or return URL. Exclude test accounts, test receipts and `environment=test` events. Use the consent-aware `yopratiqo_pass_journey` transitions; reconcile purchases/refunds from server records. For the eventual live cohort show eligible unique learners, unique consented offer viewers (denominator coverage noted), purchases by SKU, refunded cents, buyers completing their newly opened stage within seven days / buyers with seven full days of observation. Report net pre-tax receipts minus refunds, recorded processing fees and attributable costs, divided by eligible learners. Missing costs or consent coverage are unknown, not zero. There is no live cohort or price comparison to the old 29.99 hypothesis yet.

**Source trail:** `lib/yo/personalized/courseData.ts` and `lib/yo/italian/course/guidedItalian.ts` (authored course and progress), `lib/yo/italian/trivia.ts` (halfway gate and scoring), `lib/yo/yopratiqoPremiumCheckout.ts` (separate legacy hosted link), `lib/pricing/credits.ts` and `supabase/migrations/088_admin_student_credits_spendable.sql` (marketplace credit rules), `content/legal/yo-refund.fr.md` (current published policy).

## Organic Québec-French Reel draft — do not publish

- 0–4 s: Yoppo à Bologna Centrale. « Ton billet dit voie cinq. Mais écoute bien… » Afficher 2 · 3 · 5.
- 4–8 s: faire entendre l’enregistrement existant : « Il treno parte dal binario tre. » Laisser un silence pour choisir.
- 8–12 s: éclairer **3**. « Oui, voie trois ! À la gare, l’annonce change tout. »
12–15 s: « Essaie le trajet avec Yoppo. Bologne, c’est gratuit. » Lien de campagne proposé (pas de données personnelles) : `/practice/it/bologna/index.html?lang=fr&utm_source=instagram&utm_medium=organic&utm_campaign=italie_quai`. Ne pas lancer de campagne avant vérification de ce lien sur le canal de vente choisi.
