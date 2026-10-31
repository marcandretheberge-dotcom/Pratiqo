# Pratiqo native wrap — Expo / EAS

Status: implementation branch, not yet submitted to stores.

## Architecture

Pratiqo keeps the production Next.js app at `https://www.pratiqo.ca` and adds an Expo SDK 58 wrapper under `apps/mobile`.

The wrapper is intentionally more than a blind WebView:

- native safe areas and bottom navigation;
- Android hardware Back support;
- deep links through `pratiqo://`;
- Google/Apple OAuth through the system authentication browser;
- session handoff into the existing cookie-based Supabase web client;
- native handling of external links;
- WebView crash/network recovery;
- PWA service-worker/install-prompt disabled while inside the native app;
- digital purchase routes blocked in the native binary.

## Authentication

The existing web login page posts an `auth.oauth` message to React Native when it detects the native bridge. React Native performs Supabase OAuth with `WebBrowser.openAuthSessionAsync` and returns the resulting access/refresh pair to the web layer through an in-memory WebView event. Tokens are never placed in a Pratiqo-controlled URL.

The web bridge calls `supabase.auth.setSession`, calls the existing authenticated `/api/auth/profile/ensure` endpoint, and reloads once so the current server/client auth model sees the cookie session.

Required Supabase Auth redirect allowlist entry before testing:

`pratiqo://auth/callback`

## Payments

The wrapper must not expose Stripe purchase flows for digital content or in-app feature unlocks. It blocks `/yo/checkout` and `/upgrade`, and injected native-app CSS hides matching links.

Real-world teacher lesson payments are outside-app services and can continue through the existing Stripe-hosted flow, opened in the system browser.

## Store blockers remaining

1. Run `npm install` in `apps/mobile` to create and commit the mobile lockfile after dependency resolution.
2. Create/link the EAS project.
3. Configure the public Supabase values in EAS.
4. Add `pratiqo://auth/callback` to Supabase Auth redirects.
5. Configure and test the Apple provider for iOS.
6. Build Android + iOS preview binaries and complete physical-device QA.
7. Add final store screenshots, privacy/Data Safety answers, reviewer account, and listing metadata.
8. Keep digital purchase CTAs disabled until the store-billing decision is implemented.

## Identifiers

- iOS bundle identifier: `ca.pratiqo.app`
- Android application ID: `ca.pratiqo.app`
- URL scheme: `pratiqo`
