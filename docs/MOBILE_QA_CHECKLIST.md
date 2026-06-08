# Mobile QA Checklist - Pratiqo

Last reviewed: 2026-06-07

This checklist is for launch QA of the Pratiqo web app and installable PWA. It does not add a native wrapper. Record device, browser, OS version, account used, route, result, screenshots, and issue link for each pass.

## Current App Readiness Found

- App Router is in use under `app/`.
- Web app manifest exists at `/manifest.json` and `app/manifest.ts` with app name `Pratiqo`, standalone display, start URL `/`, scope `/`, theme color `#1D9E75`, and icons under `/icons`.
- PWA icon files exist: `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-512-maskable.png`.
- Root layout links the manifest, Apple mobile web app meta tags, theme color, and Apple touch icon.
- Service worker exists at `/sw.js`, is mounted by `PwaServiceWorker`, precaches static shell assets, and bypasses sensitive private/payment routes.
- Offline fallback exists at `/offline`.
- Branded custom `404`, route error, and global error pages exist.
- Mobile sizing fixes already use `100dvh` or safe-area handling in high-risk surfaces including student search, booking modal, teacher profile modal, dashboards, and YoPratiqo pages.

## Devices And Browsers

- iPhone small: iPhone SE or equivalent, Safari iOS, installed PWA.
- iPhone large: current large iPhone, Safari iOS, installed PWA.
- iPad or tablet: portrait and landscape, Safari or Chrome.
- Android small: Chrome Android, installed PWA.
- Android large: Chrome Android, installed PWA.
- Desktop responsive: Chrome, Edge, Safari if available.
- Network states: fast, slow 4G, offline, reconnect after offline.
- Input states: hardware keyboard, mobile software keyboard, zoomed text if available.

## Global Mobile Checks

- No horizontal overflow at 320px, 375px, 390px, 430px, tablet widths, and desktop responsive widths.
- Tap targets for primary actions are at least 44px high or comfortably tappable.
- Sticky and fixed elements respect iOS safe areas.
- Form fields remain visible when the mobile keyboard opens.
- Modals can be closed with visible close controls and do not trap users on small screens.
- Back and forward navigation preserve expected state or fail gracefully.
- Loading, empty, offline, error, and not-found states are branded and do not expose stack traces.
- FR primary copy is readable. EN/ES surfaces render where the product already supports them.

## Public Flow QA

| Area | Route or flow | Checks |
|---|---|---|
| Homepage | `/` | Hero readable, CTAs visible, no overflow, nav opens on mobile, YoPratiqo nav link works. |
| Search | `/trouver-un-prof`, `/student/search` when authenticated | Search form usable, filters fit, map/list switch does not overflow, cards have photos/fallbacks, public name masking remains. |
| Teacher profile | Public teacher profile and profile modal | Photo, badges, bio, pricing, home lesson info, trust box, booking CTA, close button, and long content scroll correctly. |
| YoPratiqo intro | Current intro routes | Language selector, audio buttons, flashcards, quiz, teacher bridge CTA, no paid checkout. |
| YoPratiqo module 5 | `/yo/langues/espagnol/pays/republique-dominicaine/module-5` | Premium-looking content, navigation, flashcards/quiz/printables if present, audio controls, no checkout. |
| Legal pages | `/legal/cgu`, `/legal/confidentialite`, `/legal/annulation`, `/legal/conditions-professeurs`, `/legal/membre-pro`, `/legal/accessibilite` | Markdown headings, TOC anchors, mobile tables scroll, footer links, no old legal paths. |
| 404 | Unknown route | Branded 404, useful links, no stack trace. |
| Error fallback | Simulated route error in dev/staging | Branded error, retry button when available, useful links, no stack trace. |

## Auth Flow QA

- Sign up as student, teacher, and default user if roles differ.
- Login with valid account.
- Login failure copy is understandable and does not leak internals.
- Logout returns to expected public state.
- Password reset or magic-link flow if present: request, email link, expired link, mobile deep-link behavior.
- Authenticated routes redirect safely when not logged in.
- PWA standalone mode does not break auth callbacks.

## Student Flow QA

- Search for a teacher by subject and location.
- Open teacher profile from search results.
- Open booking modal from profile.
- Select online lesson and verify required fields.
- Select at-home lesson and verify address requirement, saved-address prefill if configured, and minor/home safety disclosure.
- Verify checkout starts correctly in web browser and PWA for allowed real-time lesson bookings.
- Do not complete live payment during QA unless using approved test mode.
- Return from checkout success and confirm booking visibility in student dashboard.
- Review cancellation copy for clear refund/manual-review states.
- Confirm private address is not exposed in public teacher cards.

## Teacher Flow QA

- Teacher onboarding route loads and blocks unsupported markets as configured.
- Profile management route `/teacher/verification` is labelled profile management, not launch center or studio.
- Upload/change avatar and verify public preview path.
- Edit profile, disciplines, formats, offer/pricing, availability, teaching zone, trust, and payments sections.
- Schedule editor works on small screens.
- Stripe Connect entry point is visible only when allowed and opens the correct flow without changing payment math.
- Identity verification entry point is discoverable without claiming broad background checks.
- Membre Pro upgrade page shows monthly price, consent checkboxes, and no guarantee of bookings, ranking, visibility, students, or income.
- Teacher dashboard shows next lessons, requests, schedule, profile completeness, revenue cards, and mobile-safe empty/loading states.

## YoPratiqo QA

- Dominican Republic Spanish intro: visuals, timeline, culture, flashcards, quiz, audio, language selector, and teacher bridge CTA.
- Module navigation: previous/next links, breadcrumbs, and standalone PWA back behavior.
- Module 5: capstone content, activities, printables, mobile scroll, and no paid checkout.
- Flashcards: tap targets, state changes, audio button spacing, and no layout jump.
- Quiz: answer selection, feedback, score/result, reset, and keyboard accessibility.
- Audio: browser playback starts only after user action, controls remain visible, no client-side OpenAI calls.
- Printables: open/download behavior is understandable and does not expose private data.
- Paid modules: gated or preview-only; no Stripe checkout or native checkout.

## PWA QA

- Android Chrome install prompt or install path appears when criteria are met.
- iOS Safari Add to Home Screen uses Pratiqo name and icon.
- Installed app opens in standalone display.
- Home-screen icon uses the Pratiqo icon and maskable icon is not clipped badly on Android.
- Offline page appears when visiting navigable public pages offline.
- Service worker bypasses private, dashboard, booking, checkout, teacher, student, API, and legal routes as intended.
- Payment, checkout, and authenticated pages are never served stale from cache.
- Reconnect after offline recovers without a hard reload where possible.
- Safe-area insets are respected in standalone mode.

## Store Asset Gaps To Close Before Native Submission

- 1024x1024 source app icon export for Apple and Google review.
- Real screenshots captured from staging/production on approved test accounts.
- Reviewer demo account and instructions.
- Final app privacy labels and Google Data Safety answers reviewed against the live privacy policy.
- Native payment-policy decision for YoPratiqo paid modules and Membre Pro. These must remain disabled or gated in any native wrapper until approved.
