# Screenshot And Asset Plan - Pratiqo

Status: Planning document. Do not submit fake screenshots. Capture real screens from staging or production with approved demo accounts and no private user data.

## Existing Assets

- PWA icons already exist in `public/icons/`:
  - `icon-192.png`
  - `icon-512.png`
  - `icon-512-maskable.png`
- Use these as the reference family for app icon exports.
- Missing for store submission: reviewed 1024x1024 Apple source icon, Google Play 512x512 icon export, feature graphic, and real screenshots.

## Screenshot Sets

Apple:
- iPhone 6.7 inch set
- iPhone 6.1 or 6.5 inch set if required
- iPad set only if iPad support is claimed

Google Play:
- Android phone screenshots
- Android tablet screenshots only if tablet support is claimed
- Feature graphic

## Storyline 1 - Find A Teacher

- Route: `/trouver-un-prof`
- Account: public or student demo
- FR caption: Trouve un professeur selon tes besoins
- EN caption: Find a teacher for your goals
- Notes: Use real launch-eligible demo data only. No fake ratings or fake reviews.

## Storyline 2 - Teacher Profile

- Route: public teacher profile
- Account: public or student demo
- FR caption: Compare les formats, disponibilites et signaux de confiance
- EN caption: Compare formats, availability, and trust signals
- Notes: Do not claim broad background or criminal-record verification unless operationally true.

## Storyline 3 - Booking Request

- Route: booking modal from teacher profile
- Account: student demo
- FR caption: Demande un cours en ligne ou en personne
- EN caption: Request an online or in-person lesson
- Notes: Do not show real payment details. Avoid completed live checkout screenshots.

## Storyline 4 - Student Dashboard

- Route: `/dashboard` as student
- Account: student demo
- FR caption: Suis tes demandes et tes cours
- EN caption: Follow your lesson requests and bookings
- Notes: Use neutral demo bookings.

## Storyline 5 - Teacher Profile Management

- Route: `/teacher/verification`
- Account: teacher demo
- FR caption: Gere ton profil professeur
- EN caption: Manage your teacher profile
- Notes: Route remains `/teacher/verification`, visible copy should be profile management.

## Storyline 6 - Teacher Dashboard And Schedule

- Route: teacher dashboard or `/teacher/schedule`
- Account: teacher demo
- FR caption: Organise tes disponibilites
- EN caption: Organize your availability
- Notes: Do not show income claims or private student data.

## Storyline 7 - YoPratiqo Intro

- Route: `/yo/langues/espagnol/pays/republique-dominicaine`
- Account: public or student demo
- FR caption: Prepare-toi avec YoPratiqo
- EN caption: Prepare with YoPratiqo
- Notes: Free intro only. No paid checkout.

## Storyline 8 - YoPratiqo Activities

- Route: `/yo/langues/espagnol/pays/republique-dominicaine/module-5`
- Account: public or student demo
- FR caption: Flashcards, quiz et missions pratiques
- EN caption: Flashcards, quizzes, and practical missions
- Notes: Show real WebP visuals and interactive states. Do not imply certification or exam success.

## Capture Rules

- Use production-like data that is approved for screenshots.
- Hide or replace private email, phone, address, payment, receipt, and message details.
- Do not create fake testimonials, reviews, rankings, checkout success, or teacher earnings.
- Keep captions short and store-compliant.
- Verify each screenshot on device size, not only desktop responsive mode.
