# Audio after lesson-page transitions — 2026-11-08

Issue: iOS/WebKit can deny untrusted autoplay on a newly mounted listening question. The former rAF + synthetic HTMLElement.click() deliberately crossed the gesture boundary, causing intermittent silence, a disabled answer and sometimes a misleading generic error.

Changes:
- Both multilingual and Italian recorded players attempt automatic audio using a cancellable microtask scheduled from React's layout effect. A directly tapped page transition can retain transient user activation; a timer-driven change may still be blocked by browser policy.
- A NotAllowedError never counts as having heard the phrase. An explicit, localized "Tap Listen" status appears, and a real user tap retries; normal reading/transcript fallback remains available. Session locks are released on failure so the next question is not frozen.
- Recorded Italian autoPlay now delegates directly to its audio component rather than using requestAnimationFrame and a synthetic click from the wrapper.
- Old audio sessions cancel on text/path changes before starting the new session; delayed playing/error events cannot award listening evidence.
- No deliberate bypass of Safari's user-activation policy. Fully automatic audio after timer-driven page transitions cannot be guaranteed on every browser, especially while many utterances are device-synthesized.

Release checks: full TypeScript, focused ESLint, the new mocked iOS-denial/page-transition tests, seven multilingual journeys, nine Italian player checks and existing MP3/player tests. Production WebKit and real-device checks required before asserting 100% auto-start reliability.

Progress/points/stamps/Pass/Stripe/teacher data/server schemas are not changed. The remaining speech-recording gaps are a separate task.
