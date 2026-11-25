# Café entrance — approved design contract

## Non-negotiable owner decisions

- Use the dark espresso/cream palette from the feat-cafe review, not the old light community band.
- Preserve public/videos/cafe-world-journey.mp4 byte-for-byte. Approved SHA-256: c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6.
- Enter is immediately usable; never require completion of the film or typography loop.
- Enter → explicit native/learning-language selection → lobby → text conversation. Do not silently bypass language selection for a returning profile.
- Keep the original CafeHeroMedia multilingual invitations inside the film (timing, translations and final invitation unchanged). Do not replace them with PRAKTIKÓS.
- Below the film, run the separate PRAKTIKÓS sequence: one practice-family word and its native language label at a time, then the four individual French brand lines: Une racine. Mille langues. / Le plaisir de pratiquer. / Pas besoin de parler parfaitement. / Viens pratiquer.
- Six words per loop, rotating through a curated pool. Reserved-height typography in normal flow beneath the video with understated opacity fades. The typography never overlays, controls or remounts the video.
- Reduced motion uses static copy. A separate accessible word-pause control must not pause the film. No repeated screen-reader live announcements of decorative copy.
- Keep this review isolated: fixture data, no Supabase client, no real authentication, no Daily calls. Do not enable production flags to display a design.
- Review destination: pratiqo-cafe-pr3b.vercel.app. No new PR. Continue on feat/cafe-community-text-first; #464 was already merged, so later branch commits are not retroactively part of that merged PR.

## Linguistic review notes

This is a cognate/borrowing-family brand sequence, not a claim that every verb is the most idiomatic translation of practising a language. The French tagline is brand copy, not a literal claim that every language descends from Greek. Native labels and HTML language tags identify each form.

Corrections: Praktikoj is Albanian (Shqip), not Esperanto. Norwegian Øve is a valid practice verb but is outside the chosen root family; use Praktisere. Romanian displays the dictionary verb lemma Practica (without the infinitive marker a) to retain one word per cue.

Reviewed references for expanded/corrected entries:
- Albanian Academy, Fjalor i Madh: https://fjalori.online/?mode=exact&search=praktikim (includes PRAKTIKOJ).
- Romanian DEX 2009 entry reproduced by dexonline: https://radu.dexonline.ro/~radu/DEX/www/intrare/practica/44663 .
- Catalan IEC dictionary: https://dcvb.iec.cat/results.asp?word=practicar .
- Dutch Instituut voor de Nederlandse Taal, ANW: https://anw.ivdnt.org/article/praktiseren .
- Norwegian Academy dictionary: https://naob.no/ordbok/praktisere .
- Danish Language and Literature Society: https://ordnet.dk/ddo/ordbog/praktisere .
- Latvian University MLVV headword index and examples: https://mlvv.tezaurs.lv/_entry-list?letter=P and https://mlvv.tezaurs.lv/_search/rakt .

## Verification

Run the static review builder (which asserts the film hash), TypeScript, focused lint, community UI tests, hero lifecycle tests and tests/cafe/praktikosSequence.test.ts. The static-browser regression must check desktop and 320px mobile, the full copy sequence, returning-user language selection, pause, reduced motion, continuous media, zero overflow and no external service requests. A static preview passing these checks is not evidence of hosted real-account or Google OAuth acceptance.
