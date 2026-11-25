# Shared language start — review build, 2026-11-07

## Delivered scope
Seven original introductory modules (English, Quebec French, Spanish, German, Brazilian Portuguese, Japanese and Mandarin) share one player. Italian keeps its reviewed course and storage through an adapter; its catalogue entry is deliberately unchanged. Each new module has three first-meeting missions, 19 expressions, 10 illustrated vocabulary targets practised in two rounds, 15 checked exercises and six final questions. This is one new module per language, not a rewrite of the existing later courses.

The public catalogue points to `/yo/langues/<language>/demarrer` for these seven languages. The prior `/intro` and `/parcours` URLs remain accessible. No prior progress is migrated, reset, awarded or unlocked. New state uses `yo.shared-intro.v1.<language>`, not an entitlement. A five-of-six independent result earns the local introductory stamp; replay cannot multiply its learning points. A diagnostic recommends one of the three introductory missions without awarding achievements; experienced learners can also go to their existing course.

Yoppo asks level, goal and pace; weekly pace requires an explicit native radio selection. The result is a mission, a sentence, a pace and a primary start action. Manual choice is optional. Full vocabulary and verb/function-word references are available before starting, in a notebook and printable translated bank. Japanese and Mandarin include reading guides. A numeric custom-pace setting is not a typing exercise. No typing exercises or self-evaluation checkboxes are introduced.

## Content and images
Original dialogues, explanations, prompts and translations are authored for each target language. Age differs across English/German, French/Spanish/Portuguese, Japanese and Mandarin; the explanations and examples reflect that. Pronoun/register and region notes stay short. All names, ages and nationalities are fictional. A face or place is never treated as proof of nationality.

Only the approved individual vocabulary AVIF illustrations are reused, with separate accessible HTML labels for fictional identity, origin and age cards. No screenshots, generic replacement clip art or new image-generation assets are substituted. The success sound and Yoppo response use the existing feedback provider; pronunciation has priority.

## Audio release limitation
No paid speech generation or runtime AI calls were made. Exact or presentation-punctuation-equivalent paths are reused from language-scoped existing manifests. There are 25 existing path matches among 133 authored expressions, not 133 verified recordings. The remaining 108 currently use the correct-language device voice where installed. Quebec French and Brazilian Portuguese require the matching regional device voice. An unavailable voice offers readable text; it never counts as successful listening. Transcript-assisted final answers do not count as independent successes.

Before production release: publish and verify dedicated recordings for all new expressions, review pronunciation on physical iOS/Android devices, and complete pedagogical review. Browser audio fixtures validate UI state only. Manifest inventory is not live availability certification.

## Architecture and boundaries
JSON contains content only, shared TypeScript contains progression and validation, and one React player handles the seven new introductions. Server-only route assembly sends only the selected course to its browser. This is reusable web architecture, not an Expo build. Existing paid content, checkout, Passes, credits, booking, authentication, teacher information and server schema are untouched. Pratiqo Match remains an explicit teacher-search link. No onboarding response is sent to teachers. Goal is a stored preference, not a claim of an AI-authored personalized curriculum.

The branch is stacked on draft #436. Its existing live WebKit prefetch issue must not be represented as resolved merely because these new entry links disable optional prefetch. No production merge is part of this review build.

## References consulted for pedagogical sequencing and grammar
No textbook exercise, illustration or recording was copied. These are reference sources, not affiliations or certifications.
- English: British Council, Meeting new people — https://learnenglish.britishcouncil.org/free-resources/speaking/a1/meeting-new-people
- French: University of Texas, Français interactif, salutations — https://laits.utexas.edu/fi/voc/00/
- Spanish: University of Texas, Introduce yourself — https://laits.utexas.edu/spe/beg08.html
- German: deutsch.info, verbs — https://deutsch.info/grammar/verbs
- Portuguese: University of Texas COERLL, preliminary conversations — https://linguadagente.coerll.utexas.edu/pontos-chapters/preliminar/
- Japanese: Japan Foundation Marugoto A1 introductions — https://a1.marugotoweb.jp/en/can-do5.php
- Mandarin: Open University beginner Chinese — https://www.open.edu/openlearn/mod/oucontent/view.php?id=108532

## Evidence
The dedicated CI runs full-repository types, focused lint, language-content/state checks, seven full rendered journeys, prior regression suites and real-route Chromium/WebKit checks. Screenshots, actual source hashes, inventory and logs are uploaded. Review results must be read from the run, not inferred from this document. Live deployment checks and physical device validation are separate.
