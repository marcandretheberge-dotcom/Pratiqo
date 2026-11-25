# Café des langues — PR3b Daily embed requirements

Status: design contract only. PR3a does not load the Daily browser SDK, embed an iframe, loosen headers, or enable reservations.

## Provider and authorization boundary

- Pratiqo remains the sole authorization source.
- The browser receives a Daily room URL and short-lived token only from an authenticated, authorized join route.
- Tokens are passed to `DailyIframe.join({ url, token })`; never append them to URLs, query strings, analytics, logs, or error reports.
- Daily rooms are private. A room URL alone must not grant entry.
- The participant-facing identity is first name plus a per-session opaque HMAC identifier. Never send the canonical profile UUID, email, surname, marketplace role, Stripe data, or learner-child records.
- `CAFE_DAILY_ROOM_HMAC_SECRET` and `CAFE_DAILY_PARTICIPANT_HMAC_SECRET` are stable identifier keys, not routine API credentials. Rotating either requires an explicit binding/identity migration and active-room plan; an unplanned change intentionally fails closed.

## Browser integration

Use the pinned `@daily-co/daily-js` npm package in PR3b rather than a remote script.

The room route will need narrowly scoped headers:

- CSP `frame-src` for the configured Daily subdomain.
- CSP `connect-src` entries required by Daily, confirmed against current Daily documentation before implementation.
- iframe `allow="camera; microphone; autoplay"`.
- Do not allow `display-capture` while screen sharing is disabled.
- Fullscreen only if the final room UX uses it.
- Scope Permissions-Policy/CSP changes to the Café room route wherever the Next.js deployment architecture permits; do not globally relax the whole site by default.

## Daily development-account verification

Mocks prove the payload contract, not the provider account or browser behavior. Before PR3b can enable a real room, run a dedicated Daily development-account check and retain the results with the release evidence:

- confirm the Daily domain dashboard does not enable recording, live streaming, transcription or dial-out by default;
- create a private test room through the PR3a adapter and fetch it back through Daily’s REST API;
- confirm the returned room configuration matches the fail-closed assertions in `daily.ts`, including recording off, captions UI off, chat off, screen sharing off, camera/microphone initially off and the expected `nbf`/`exp`;
- mint participant and host test tokens and verify both remain `is_owner: false` and `canAdmin: false`;
- verify the Pratiqo-controlled eject/ban request prevents the same opaque `user_id` from rejoining that room;
- confirm the room URL without a valid meeting token cannot enter the private room;
- exercise iPhone Safari, Android Chrome and a desktop browser, including dropped-connection recovery;
- do not enable production flags if the live provider response contains an unrecognized or unsafe configuration value.

The Daily domain, API key and HMAC identifier keys are server-only. Record which Daily domain and key version were tested, but never include the key values, meeting tokens or room URLs in the evidence.

## Proxy and request-origin assumptions

The current join routes authenticate with an explicit Supabase bearer token rather than a session cookie, so they do not rely on browser cookie CSRF protection. Their pre-auth IP limiter assumes the application is reached directly through Vercel, where the forwarded client-IP header is platform controlled. Re-review this assumption before placing another CDN or reverse proxy in front of Vercel.

## UX and safety gates

Before a real session with strangers can open:

- camera starts off;
- microphone starts muted and is user-controlled;
- recording, live streaming and transcription stay unavailable;
- chat and screen sharing remain off for the pilot;
- the host has a Pratiqo-owned “Remove and block” action that first persists `session_removals`, then ejects/bans the opaque provider participant;
- do not expose Daily Prebuilt’s native removal control as the product moderation path, because it would bypass Pratiqo’s persistent removal state;
- a visible Pratiqo report path exists;
- provider-down, reconnecting, too-early, removed, cancelled and ended states are designed;
- the assigned host and operational cancellation/notification process are confirmed;
- cancelling a live/upcoming Café invalidates future Pratiqo joins and also deletes or closes the provider room so already-issued short tokens cannot keep the cancelled session open.

## Privacy and legal launch gates

Before activation:

- counsel reviews Daily’s DPA, subprocessors, media-processing locations, metadata retention, deletion and breach terms;
- the Québec Law 25 cross-border privacy assessment is complete;
- Pratiqo’s privacy notice covers live audio/video processing;
- the adults-only Café rules and report process are live;
- recording remains disabled by product decision, room configuration, token configuration and verified Daily-domain settings;
- the retention period for adult/rules acceptance evidence and moderation records is approved.

## Deferred beyond PR3b

- reservation activation and authentication return flow (PR3c);
- attendance and host-confirmed check-in;
- reminders and waitlists;
- one-to-one matching;
- any recording or transcription capability.
