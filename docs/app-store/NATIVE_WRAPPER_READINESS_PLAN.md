# Native Wrapper Readiness Plan - Pratiqo

Status: Planning only. This document does not add Capacitor, native projects, native checkout, or app-store submission configuration.

## Phase 1 - PWA And Mobile Web Hardening

Goal: Make the current web app and installable PWA reliable before a native shell exists.

- Complete mobile QA checklist across iOS, Android, tablet, and desktop responsive.
- Confirm manifest, icons, standalone display, service worker, and offline behavior.
- Keep private/payment routes out of service-worker cache.
- Capture real screenshots for the store plan from staging or production.
- Validate privacy labels against live privacy policy and actual data flows.

## Phase 2 - Native Wrapper Prototype

Goal: Build a private prototype only after product, legal, and payment policy review.

- Choose native wrapper technology.
- Define allowed routes inside the shell.
- Gate unsupported or policy-sensitive routes.
- Confirm push notification, file upload, camera, microphone, and location permissions.
- Confirm auth callback and deep-link behavior.
- Prepare reviewer demo accounts.

## Phase 3 - Store Submission Readiness

Goal: Submit only after policy, privacy, legal, and payment review.

- Apple App Store and Google Play metadata finalized.
- Privacy labels and Data Safety forms match implementation.
- Screenshots are real and approved.
- Support, privacy, and contact URLs are live on `https://www.pratiqo.ca`.
- Native payment decisions are implemented or gated.

## Feature Gates Required Before Native Submission

- YoPratiqo paid module checkout: disabled in native wrapper until native billing and legal review are complete.
- Membre Pro subscription purchase: native strategy pending. Do not route around Apple or Google digital-goods subscription policies.
- External payment messaging: review all copy and links before submission.
- Marketplace one-to-one lesson bookings: review Apple and Google policy. These may differ from digital goods, but the decision must be explicit.
- Group-session checkout: keep launch gate status aligned with production readiness runbook.
- Teacher verification claims: do not claim criminal-record verification or broad screening unless operationally true and reviewed.

## Routes Likely Safe For Prototype Review

- `/`
- `/trouver-un-prof`
- Public teacher profiles
- Student dashboard
- Teacher dashboard
- `/teacher/verification`
- `/teacher/schedule`
- Free YoPratiqo intro routes
- Legal and support pages as web content

## Routes Requiring Extra Review

- Stripe checkout entry points
- Membre Pro upgrade flow
- Any future YoPratiqo paid module flow
- Identity verification upload/start flows
- Home-lesson flows involving minors
- Any route that collects exact address or sensitive documents
