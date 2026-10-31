# Pratiqo Mobile Wrapper

Expo/React Native wrapper for the production Pratiqo web application.

## What is native

- iOS and Android binaries through EAS Build.
- Safe-area shell and native bottom navigation.
- Android hardware Back handling.
- System-browser OAuth instead of Google/Apple login inside a WebView.
- Native deep-link scheme: `pratiqo://`.
- External URLs and Stripe hosted pages open in the system browser.
- WebView crash/network recovery.
- Native/store guard blocks digital-purchase routes such as `/upgrade` and `/yo/checkout`.

The existing Next.js application remains the source of truth for marketplace and YoPratiqo screens.

## Environment

Copy `.env.example` to `.env.local` for local development, or configure the same public variables in the EAS environment.

Never put `SUPABASE_SERVICE_ROLE_KEY`, OpenAI keys, Stripe secret keys, or any server secret in this app.

Required public values:

- `EXPO_PUBLIC_WEB_ORIGIN=https://www.pratiqo.ca`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or the legacy public anon key.

## OAuth setup still required before device login testing

Add this redirect URL to the Supabase Auth redirect allowlist:

`pratiqo://auth/callback`

Google continues through the Supabase Google provider. Before App Store submission, enable/configure the Apple provider in Supabase and test the Apple button on a physical iOS build.

## Run

```powershell
cd apps/mobile
npm install
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
