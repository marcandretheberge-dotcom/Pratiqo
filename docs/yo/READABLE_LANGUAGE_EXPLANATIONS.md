# Comprendre la langue — readable teaching

## Scope
The guided Italian grammar step now renders the reusable LanguageExplanation component. Original lessons, exercises, answer keys, ordering, progress IDs, vocabulary images, audio, sound/haptics, Passes and credit logic are unchanged. This is authored teaching material, not a new ChatGPT/API chat integration.

The first module's three grammar explanations are rewritten in French, English and Spanish. Each uses a short situation, one concept per labelled block, clearly separated Italian examples/translations, an essential recap, and optional deeper notes. The age explanation connects with French/Spanish avoir/tener while explicitly explaining the different English age pattern.

The other 33 Italian lessons keep their existing wording, but receive readable paragraphs and all existing translated examples instead of a three-example slice. This is presentation work, not a claim that their entire curriculum has been rewritten. No other language renderer or Expo binary is changed in this increment.

## Navigation and assessment
The existing Continue button remains the only primary next action. Reading or expanding deeper notes grants no points or mastery and never blocks completion. No typing field or self-rating control is added. Detailed notes remain available through a keyboard-accessible native details element.

## Verification
The new invariant suite covers all three interface locales, every later-unit paragraph/example, translated teaching links and no scoring/network side effects. Browser checks exercise the actual route component with synthetic local drafts, optional notes, notebook round-trip, responsive widths and the normal next step. The existing full personalized-course walkthrough is retained to check the normal complete learner flow.

Publication requires review; no production merge or Expo submission is included.
