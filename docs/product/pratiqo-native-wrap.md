# Pratiqo native wrap — Expo / EAS

Status: consolidated implementation branch, private isolated iPhone QA only.
Not merged, not submitted to stores, and not approved for production-native auth/payments.

## Architecture

Pratiqo keeps its Next.js product and one Expo SDK 58 wrapper under `apps/mobile`.
Preview now requires an explicit isolated HTTPS origin and a fresh local gateway
attestation. It cannot default to the production site or use the production
Supabase client. Production web behavior is unchanged.

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

## Café entrance and ambient video — 2026-11-13

The native bottom navigation includes **Café**, opening the shared `/cafe` route.
The web feature gates and the isolated gateway remain authoritative; this tab
does not enable Café in production or authorize its network mutations.

The WebView keeps inline playback and the existing user-gesture requirement.
The Café entrance therefore retains a poster and an explicit Play control when
autoplay is refused. Its entry button must work immediately whether video plays
or not. The outer native SafeAreaView owns top and bottom insets; automatic iOS
WebView content insets are disabled to avoid reserving the same space twice.

On page load and native AppState changes, the shell publishes
`window.__PRATIQO_APP_STATE__` as `active`, `inactive` or `background`, then emits
`pratiqo:app-state`. It runs in isolated mode as well as normal mode, without
requiring a native Supabase client. Both the queued page and the executing page
must have the configured HTTPS origin. Unknown native states map to background.
The web ambient-video controller can pause while hidden and respect the user's
play/pause choice when the app returns. This signal grants no playback or media
capture permission.

This source update does not produce a new signed binary. The historical trial
tunnel has expired; a new isolated environment and physical-device checks are
still needed before native distribution. Daily camera/microphone use inside the
wrapper is not validated by background-video support and remains a separate gate.

## Authentication

The existing web login page posts an `auth.oauth` message to React Native when it detects the native bridge. React Native performs Supabase OAuth with `WebBrowser.openAuthSessionAsync` and returns the resulting access/refresh pair to the web layer through an in-memory WebView event. Tokens are never placed in a Pratiqo-controlled URL.

The web bridge calls `supabase.auth.setSession`, calls the existing authenticated `/api/auth/profile/ensure` endpoint, and reloads once so the current server/client auth model sees the cookie session.

Required Supabase Auth redirect allowlist entry before testing:

`pratiqo://auth/callback`

## Payments

The wrapper must not expose Stripe purchase flows for digital content or in-app feature unlocks. It blocks `/yo/checkout` and `/upgrade`, and injected native-app CSS hides matching links.

Real-world teacher lessons remain handled by the existing web payment system.
This consolidation does not implement a correlated native payment-return flow:
direct provider navigation is blocked until that flow is separately validated.
All payments, bookings and message routes are disabled in the isolated trial.

## Store blockers remaining

1. Preserve the committed mobile lockfile; use `npm ci`.
2. EAS project linked; verify free build quota and signing credentials before remote build.
3. Native OAuth requires a separately isolated Auth environment before its own QA;
   the current EAS Preview intentionally contains no usable Supabase credentials.
4. Add `pratiqo://auth/callback` to Supabase Auth redirects.
5. Configure and test the Apple provider for iOS.
6. Build Android + iOS preview binaries and complete physical-device QA.
7. Add final store screenshots, privacy/Data Safety answers, reviewer account, and listing metadata.
8. Keep digital purchase CTAs disabled until the store-billing decision is implemented.

## Identifiers

- iOS bundle identifier: `ca.pratiqo.app`
- Android application ID: `ca.pratiqo.app`
- URL scheme: `pratiqo`

## Historical preparation verified 2026-11-01 (superseded below)

- EAS owner/slug: `markitos2222s-organization/pratiqo-mobile`.
- EAS project ID: `b52003f2-c064-4aba-a272-2b949b62751e`.
- Preview explicitly selects the Preview environment and Android APK output.
- Only the web origin, Supabase URL and publishable key were copied into the
  ignored mobile `.env.local` and configured as sensitive project-scoped Preview
  variables. Sensitive visibility does not make a client-bundled key secret.
- Source environment file was not modified. No server credentials copied.
- Read-only Auth settings request accepted the publishable key: Google enabled,
  Apple disabled. This does not verify the native callback allowlist or login.
- Earlier local checks: exact `npm ci`, Expo compatibility and Expo Doctor 20/20
  passed. Installation reported 12 moderate vulnerabilities; not auto-fixed.
- Rechecked after linkage: `npx tsc --noEmit` passed; root
  `node tests/app/nativeMobileWrap.test.ts` passed; Android Hermes export via
  `npx expo export --platform android --output-dir .expo/android-preview-export`
  passed (709 modules). Export output is ignored by Git.
- This is a JavaScript/Hermes bundle, not a signed APK. No Android build ID,
  versionCode or installable artifact yet. No iOS build or physical-device QA.
- Remote quota/signing, native callback allowlist, Google device login, Apple
  provider configuration and store assets remain unverified. Full web build and
  Italian/Japanese/audio suites were not rerun in this preparation step.
- Keep PR #417 draft. No store submission or merge performed.

## Android Preview build 2026-11-01

Historical build below: it uses production services and MUST NOT be used as the
isolated consolidated trial. The same applies to the earlier iOS build
`bd9e38d7-f7c2-4dc1-8046-676ba4e6a7be`.

- Read-only EAS account check confirmed Free subscription, billing period
  2026-11-01 through 2026-12-01 UTC, Android usage 0/15 before launch (total 0/30).
- No existing Android credentials for this project. Created a new EAS-managed
  keystore without replacing or downloading any existing key.
- Started `eas build --platform android --profile preview --non-interactive
  --freeze-credentials --no-wait`; no submission flag or paid-plan change.
- Build ID: `b58f8310-cd4e-4595-a71d-bfcc1f56a132`.
- Final EAS status: `FINISHED`, no build error.
- Installable APK: https://expo.dev/artifacts/eas/ttrch0bFIhWEWhhHZswpCmTyV1XKSz29WdZSRRwJbpE.apk
- Build/install page: https://expo.dev/accounts/markitos2222s-organization/projects/pratiqo-mobile/builds/b58f8310-cd4e-4595-a71d-bfcc1f56a132
- This supersedes the earlier preparation note stating that no APK existed.
  Device installation, native OAuth and audio playback remain untested.
- App version `1.0.0`, remote Android versionCode `1`, package `ca.pratiqo.app`.
- Source is commit `06d16529103791c4c0d23ad6add6d80087a31720` plus the local
  project-linkage and Preview/APK configuration changes; not a clean commit build.
- Uses production web/Supabase public configuration, not a synthetic sandbox.
  Do not create test bookings, payments or notifications during installation QA.

## PR411 consolidation - 2026-11-01

PR417 is the sole maintained application (`apps/mobile`). PR411's `mobile/`
directory and separate auth/payment protocol are not imported or merged.
The previous local EAS linkage/configuration changes have been preserved.

| Source | Decision |
| --- | --- |
| PR417 native shell, bottom tabs, public assets, EAS project and signing | Keep |
| PR411 explicit HTTPS origin, no production fallback | Port into tested policy |
| PR411 scheme filtering and new-window handling | Port; apply to configured origin, including deep links |
| PR411 source-origin/size/schema validation for bridge messages | Port into PR417's existing message protocol |
| PR411 explicit retry after renderer/network failure | Port; no forced background reload |
| PR411 isolated gateway and synthetic learner workflow | Reuse outside Git, separate ports 55600/55601 |
| PR411 separate PKCE callbacks and sandbox checkout endpoints | Do not import; avoid competing auth/payment paths |

Additional corrections: reject implicit-token OAuth callbacks, validate exact
PKCE callback destination, suppress raw OAuth exception logging, use YoPratiqo's
full product name, and prevent Preview builds with production public credentials.
The existing server authorization, consent and booking/payment logic is untouched.

### Isolation and distribution

- Local database/Auth/Storage: existing PR405 Docker stack, loopback only.
- Read-only preflight: all accounts synthetic (`@example.invalid`), learner
  project table/RPC present, no cron relation, no outbound-service credentials.
- Schema already initialized through the controlled bootstrap; no migration run.
- Existing synthetic learner account reused; no new legal declaration required.
- One authorized free Cloudflare tunnel, maximum 24 hours, to an allowlisted
  gateway. DB, Studio, mailbox, admin, arbitrary REST mutations, OAuth, payment
  and messaging endpoints are not exposed. Only the learner-project PUT is open
  after local authentication; existing ownership/RLS checks remain authoritative.
- The native binary has no Supabase key; the gateway supplies only the local
  public key to the isolated WebView email entry. Server keys never enter it.
- EAS `preview` alone receives the temporary public origin. EAS Production,
  Vercel, production Supabase and other projects are unchanged.
- Existing ad-hoc signing includes the owner's registered iPhone. No certificate
  replacement, Apple subscription or store submission is required.
- Physical install is a signed internal IPA, not Expo Go and not TestFlight.

### Signed isolated iPhone build and runtime QA

- Code commit: `358f9b00c145719c8537435857983c09cc3edbaa`.
- Signed internal iOS build: `7bf15312-9c35-4b96-a59c-596032782389`, EAS
  `FINISHED` at 2026-11-01 18:57 UTC. Existing ad-hoc provisioning includes the
  owner's iPhone ending `3EDB801C`.
- Installation: https://expo.dev/accounts/markitos2222s-organization/projects/pratiqo-mobile/builds/7bf15312-9c35-4b96-a59c-596032782389
- Downloaded the actual IPA and inspected its bundled JavaScript and provisioning
  profile: isolated origin present, production Supabase project reference absent,
  intended registered iPhone present. This is stronger than a local export check,
  but is not a claim that physical installation has already succeeded.
- First remote attempt `e5df972a-5622-48a3-8c0b-6ceff7ae2d32` was deliberately
  rejected by the config guard because EAS Preview still supplied production
  public Supabase values despite the profile's inert values. Corrected the three
  project-scoped EAS **Preview** variables to the inert sentinel; did not relax
  the guard, change Production, or copy a server credential. The retry succeeded.
- Free quota checked immediately before retry: iOS 1/15, Android 1/15, total
  2/30, Free plan. No plan change, charged build, certificate replacement or
  store submission was requested.
- Tunnel automatically expires 2026-11-02 13:41 America/Toronto. It is not a
  permanent backend; the PC and local Docker stack must stay running. A later
  origin needs a newly authorized tunnel and matching isolated build.
- Full HTTPS Next production rebuild passed with the local synthetic backend,
  including TypeScript. The remote mobile workflow
  https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/41339081435
  passed for the code commit. Vercel's Preview check also passed; its backend
  was not used for testing and must not be assumed isolated.

Actual browser tests, using real local Auth and real learner-project handlers:

| Check | Result |
| --- | --- |
| Local synthetic email login | PASS |
| Save French/online project and reload | PASS; persisted server response shown |
| Project link carries exact subject and format to search | PASS; French/online has 0 fixture results, piano/online has 4 |
| Interrupt unsaved Spanish edit by reload | PASS; entered subject restored |
| Stop only this prototype's Next process, then save | PASS; explicit failure, fields preserved, no false success |
| Restart same server and retry the same edit | PASS; Spanish project saved |
| Final synthetic project reset through UI to piano/online | PASS |
| Widths 375, 390, 430 | PASS; no horizontal overflow |
| Legacy width 320 | Existing web layout overflows by 6px; not fixed by hiding content |
| Gateway anonymous access and sensitive-route blocks | PASS; login required and 14 restricted requests return 403 |
| Gateway real homepage/search/dashboard GET | PASS; HTTP 200 |

The intentionally strict gateway blocks automatic YoPratiqo progress initialization
writes; the browser logs `seedStudentProgress: insert failed`. This is a known
restriction of this read-only-content trial, not a successful progress/audio test.
No actual booking, payment, message, notification or production write was tested.

Commands executed in this consolidation (local helpers are outside Git):

```text
node mobile-417-local/preflight.cjs                         PASS
npx tsc --noEmit (apps/mobile)                            PASS
npx eslint apps/mobile/App.tsx apps/mobile/src/*.ts apps/mobile/app.config.ts tests/app/nativeMobilePolicy.test.ts  PASS
npm run test:mobile-wrap                                 PASS
npm run test:auth                                        PASS
node mobile-417-local/mobile.cjs compatibility            PASS
expo-doctor (installed CLI)                              PASS 20/20
node mobile-417-local/mobile.cjs export                   PASS
node mobile-417-local/app.cjs build (HTTPS config)         PASS
node mobile-417-local/gateway-qa.cjs                      PASS
node mobile-417-local/install-artifact.cjs                PASS
git diff --check HEAD^ HEAD                              PASS
```

No full unrelated business test suite was repeated. No migration was applied.
The source code of learner-funnel, PR411, staffrelay and Denise was not changed.

### Short physical iPhone scenario

1. Open the installation link in Safari on the already registered iPhone and
   select Install. This is a signed native app, not Expo Go; no SDK upgrade or
   local root certificate is needed. Sign in to the existing Expo account only
   if Expo asks. Do not purchase a subscription.
2. Launch Pratiqo. It must show the isolated-test entry, not the live login.
   Use the existing synthetic learner credentials supplied privately, never a
   real account. Google/Apple/Stripe are intentionally unavailable.
3. Open teacher search, edit the learning project, save, close/reopen the app
   and confirm the project remains. Try an unsaved edit, background/resume and
   verify typing/keyboard, scrolling, safe areas and Back gestures.
4. Report any error or screenshot. Stop if live services appear. The environment
   expires automatically; do not install the historical production-backed builds.

### Validation evidence

- Native TypeScript: PASS.
- Targeted lint: PASS, no errors/warnings in changed mobile/test files (the
  tool also reports an old Browserslist dataset; no dependency upgrade made).
- `npm run test:mobile-wrap`: existing contract + 7 executable policy tests PASS.
- Expo dependency compatibility: PASS against the online dependency map.
- Expo Doctor: 20/20 PASS. Existing web `npm run test:auth`: PASS.
- iOS Hermes export: PASS, 712 modules. Embedded origin matches the isolated
  tunnel; production Supabase project reference absent from the binary.
- Initial full Next production build against local synthetic backend: PASS,
  including TypeScript. Final HTTPS rebuild/runtime QA is recorded below.
- Build/device/runtime details are recorded below after their actual completion.

### Remaining acceptance limits

The isolated trial intentionally covers navigation, search and persisted learner
project editing, not Google/Apple OAuth, teacher publication or Stripe. Native
auth still needs real-device cancellation/resume and secure session-storage
review before release. No payment-return, store approval, offline capability,
upload or physical Safari/WebView success is inferred from policy tests or bundle
exports. Keep PR417 draft until the owner completes the physical iPhone scenario.
