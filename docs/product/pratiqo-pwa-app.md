# Pratiqo PWA App Foundation

Last updated: 2026-08-28

Pratiqo is installable as a Progressive Web App from the mobile browser. This is a web-app foundation only: it is not an Expo/native wrapper, and it does not enable App Store or Play Store submission.

## Manifest

- Browser manifest URL: `/manifest.json`
- Next App Router manifest route: `app/manifest.ts`
- Both manifest sources are intentionally aligned through `lib/pwa/manifest.ts`.
- App name and short name: `Pratiqo`
- Display mode: `standalone`
- Start URL and scope: `/`
- Theme color: `#1D9E75`
- Background color: `#ffffff`

## Icons

The PWA uses existing Pratiqo icon assets:

- `/icons/icon-192.png`
- `/icons/icon-512.png`
- `/icons/icon-192-maskable.png`
- `/icons/icon-512-maskable.png`
- `/apple-touch-icon.png`

The 192 maskable icon is derived from the existing official Pratiqo 192 icon. No logo redraw, recolor, or replacement asset was introduced.

## Install Guidance

The mobile install prompt is lightweight and dismissible. It is hidden when:

- the app is already running in standalone/fullscreen display mode;
- the route is private, authenticated, checkout/payment-sensitive, or auth-sensitive;
- the browser appears to be a crawler or preview bot;
- the user dismissed the prompt.

Manual install instructions are available at `/app`.

## Offline Behavior

The service worker precaches only safe static shell assets and the offline fallback. It bypasses private, authenticated, booking, checkout, payment, admin, legal, messaging, and YoPratiqo checkout routes.

No push notifications, native wrapper behavior, payment changes, booking changes, or teacher discovery logic changes are part of this foundation.
