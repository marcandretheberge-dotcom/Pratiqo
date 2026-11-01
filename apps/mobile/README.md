# Pratiqo Mobile Wrapper

Single Expo/React Native wrapper, consolidated from PR411 into PR417. The
`apps/mobile` directory is the only maintained native implementation. Do not
merge the older `mobile/` shell alongside it.

## What is native

- iOS and Android binaries through EAS Build.
- Safe-area shell and native bottom navigation.
- Android hardware Back handling.
- System-browser OAuth instead of Google/Apple login inside a WebView.
- Native deep-link scheme: `pratiqo://`.
- External URLs require confirmation; auth/payment provider navigation cannot
  bypass the dedicated browser flow. All external links are closed in the isolated test.
- WebView crash/network recovery.
- Native/store guard blocks digital-purchase routes such as `/upgrade` and `/yo/checkout`.

The existing Next.js application remains the source of truth for marketplace and YoPratiqo screens.

## Environment

Preview is isolated by default and requires an explicit HTTPS test origin.
There is no fallback to production. Preserve existing local environment files;
use `EXPO_NO_DOTENV=1` and explicit variables for the isolated build.

Never put `SUPABASE_SERVICE_ROLE_KEY`, OpenAI keys, Stripe secret keys, or any server secret in this app.

Isolated Preview values:

- `EXPO_PUBLIC_NATIVE_MODE=isolated`
- `EXPO_PUBLIC_WEB_ORIGIN`: approved temporary HTTPS gateway origin.
- No Supabase credentials are required by the native test binary. EAS Preview
  overrides all three public Supabase variables with an inert sentinel.
  Set those project-scoped EAS Preview values as well as the profile values:
  remote variables can otherwise reintroduce old public production settings.
  The config guard refuses that build; never disable it to bypass the failure.
- Before mounting its WebView, the app requires a fresh
  `/__sandbox/mobile-config` response proving the configured gateway reports
  local synthetic mode, no OAuth, no payments and no outbound messages.
  This attestation is an additional guard, not a substitute for inspecting the
  gateway, environment and underlying database before opening the tunnel.
- Local email authentication and the existing learner-project handlers run in
  the WebView. The isolated email entry is external test infrastructure, never
  a shipped change to Pratiqo authentication.

Production mode requires explicit `EXPO_PUBLIC_NATIVE_MODE=production`, the
canonical origin and public Supabase values. It is not authorized for this QA.

## OAuth setup still required before device login testing

Add this redirect URL to the Supabase Auth redirect allowlist:

`pratiqo://auth/callback`

Google continues through the Supabase Google provider. Before App Store submission, enable/configure the Apple provider in Supabase and test the Apple button on a physical iOS build.

## Run

```powershell
cd apps/mobile
npm ci
npx expo-doctor
npx expo start
```

For a real device and store-like WebView/auth behavior, use EAS preview builds rather than Expo Go:

```powershell
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

## Store policy guard

Teacher lessons are real-world services and may continue to use the existing web payment flow. Digital YoPratiqo checkout and Membre Pro purchase are not exposed through this wrapper until StoreKit / Google Play Billing (or a permitted regional alternative) is implemented.

The web app currently has YoPratiqo paid checkout disabled; the wrapper also blocks direct navigation to known digital-purchase routes as defense in depth.
The isolated build blocks all booking/payment/message navigation. Do not infer
payment-return readiness from a successful navigation test. No PR411 payment
handler or alternative OAuth callback was imported.

## Recovery and tests

`npm run test:mobile-wrap` at the repository root tests the native/web contract
and the real shared policy (origins, schemes, deep links, bridge messages,
PKCE callback shape and isolation expiry). From `apps/mobile`, run
`npx tsc --noEmit`, `npx expo install --check`, `npx expo-doctor` and an iOS
export with an explicit isolated origin. Exports are not signed iPhone binaries.

Network failures and renderer termination show a retry action instead of
silently reloading and losing form input. Background/resume does not navigate.
OS termination still requires the existing server-saved project to be reloaded.
Physical device keyboard, gestures, safe areas and persistence require an
actual iPhone test. See `docs/product/pratiqo-native-wrap.md` for current evidence.
