# YoPratiqo Printable Resources QA

Scope: printable-resource system for YoPratiqo lessons and Dominican Republic modules.

## Routes To Check

- French Quebec Lesson 3 kit: `/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie`
- Dominican Republic Module 2: `/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee`
- Dominican Republic Module 3: `/yo/langues/espagnol/pays/republique-dominicaine/module-3/ressources/fiches-pratique`
- Dominican Republic Module 4: `/yo/langues/espagnol/pays/republique-dominicaine/module-4/ressources/fiches-exploration`
- Dominican Republic Module 5: `/yo/langues/espagnol/pays/republique-dominicaine/module-5/ressources/cahier-a2`

## Lesson And Module Cards

- Lesson 3 kit opens from the final screen.
- RD Module 2 shows a printable resource card, not a long worksheet dump.
- RD Module 3 shows one consolidated printable resource, not duplicated printables.
- RD Module 4 shows a printable resource card, not five inline sheets.
- RD Module 5 shows a printable workbook card, not seven inline sheets.
- Mobile cards fit without horizontal overflow.
- Desktop cards look consistent with the premium YoPratiqo module design.

## Print Pages

- Each print route opens cleanly.
- The print button is visible on screen.
- Browser print preview is readable.
- App header/nav/buttons do not appear in print preview.
- Cards avoid awkward page breaks where possible.
- Spanish target phrases remain visible and readable.
- No raw quiz answers or private learner data appear.

## PDF Policy

- No fake PDF download exists.
- PDF links appear only when a real PDF asset exists.
- Current resources use print-friendly routes with print CSS and `window.print()`.

## Safety

- No paid YoPratiqo unlock is introduced.
- No Stripe, payment, tax, Supabase, RLS, migrations, legal, MP3, or OpenAI behavior is touched.
