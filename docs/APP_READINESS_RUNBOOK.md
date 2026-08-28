# Pratiqo App Readiness Runbook

Last reviewed: 2026-06-07

This runbook prepares Pratiqo as an installable PWA before any future native iOS or Android wrapper. It is operational guidance only and contains no secrets.

## 1. PWA Install Checklist

- Web app manifest available at `/manifest.json`.
- App name: `Pratiqo`.
- Display mode: `standalone`.
- Start URL and scope: `/`.
- Theme color: `#1D9E75`.
- Background color: `#ffffff`.
- Required icons exist:
  - `/icons/icon-192.png`
  - `/icons/icon-512.png`
  - `/icons/icon-192-maskable.png`
  - `/icons/icon-512-maskable.png`
  - `/apple-touch-icon.png`
- HTTPS enabled in production.
- Root layout links the manifest and Apple touch icon.
- Root layout declares Apple mobile web app meta tags.
- `/app` explains manual install steps for iPhone and Android.
- Chrome installability checked in Lighthouse or DevTools.
- iOS Add to Home Screen checked manually on Safari.

## 2. Mobile QA Checklist

- Landing page uses responsive spacing and no horizontal overflow.
- Student search page does not use legacy `100vh` mobile sizing.
- Teacher profile modal fits within `100dvh` on mobile.
- Booking modal fits within `100dvh` and keeps inputs reachable with the keyboard.
- Student dashboard loading/empty states use `100dvh`-safe sizing.
- Teacher dashboard loading/empty states use `100dvh`-safe sizing.
- YoPratiqo intro pages keep tap targets readable and do not introduce horizontal overflow.
- YoPratiqo Module 1 keeps tap targets readable and does not introduce horizontal overflow.
- Sticky/fixed UI is checked against iOS safe areas.
- Buttons and links used as primary actions should be at least 44px tall.

## 3. iOS / Android Native Wrapper Plan

Capacitor or another native wrapper is a future P2 project, not part of this PR.

Before native submission:

- Decide which web routes are allowed inside the native shell.
- Gate or hide unsupported native payment flows.
- Confirm push notification strategy.
- Confirm camera, microphone, file upload, location, and notification permissions.
- Prepare App Store and Play Store screenshots, privacy labels, and review notes.
- Re-run legal and payment-policy review before submission.

## 4. CRITICAL - App Store / Play Store Payment Policy

- PWA/web: Stripe checkout remains valid for Pratiqo web flows.
- Native iOS app: Apple IAP is required for YoPratiqo paid modules and Membre Pro subscriptions. Do not submit to the App Store with Stripe checkout enabled for digital content.
- Native Android app: Google Play Billing is required for digital goods. Do not submit to Google Play with Stripe checkout enabled for digital content.
- Lesson bookings for 1:1 real-time services may use Stripe in native apps, but this must be verified against current Apple and Google policy before submission.
- YoPratiqo paid checkout must remain disabled until the product and payment policy plan is approved.

## 5. Native App Feature Gating Plan

Disable or gate these before native submission unless native billing is implemented and approved:

- YoPratiqo paid module checkout.
- Membre Pro subscription purchase.
- Any digital-content subscription or one-time purchase using Stripe.
- Any external link that appears to route around Apple or Google digital-goods payment rules.

Routes that can remain candidates for native review after QA:

- Public teacher search.
- Teacher profile browsing.
- Student dashboard.
- Teacher dashboard.
- Lesson booking for real-time services, subject to policy verification.
- Free YoPratiqo intros.

## 6. Screenshot / Asset Checklist

- App icon 1024x1024 source prepared from the Pratiqo logo.
- PWA icons generated from the same brand source.
- iPhone screenshots.
- iPad screenshots if iPad is supported.
- Android phone screenshots.
- Android tablet screenshots if tablets are supported.
- Short app description.
- Long app description.
- Support URL.
- Privacy policy URL.
- Demo account or reviewer instructions if authenticated flows are reviewed.
