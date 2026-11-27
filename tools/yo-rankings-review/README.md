# Local synthetic ranking review

This harness renders the actual `RankingsAccount`, ranking CSS, shared header and Yoppo assets. All profiles, friend requests, positions and XP values are **explicitly synthetic**. A deterministic in-memory adapter replaces the ranking transport; the Supabase/auth modules are disabled. No credentials, provider accounts, external messages or browser persistence are used. The static server only binds to `127.0.0.1:55857`; its CSP disallows network connections and it has no API proxy.

From the repository root, after `npm ci`:

```sh
node tools/yo-rankings-review/build.mjs
node tools/yo-rankings-review/server.mjs
```

Open `http://127.0.0.1:55857/` in the same machine/network namespace. Controls select French, English or Spanish; a desktop, 390 px or 320 px iframe; and populated, private, empty or unavailable states. Product navigation is disabled in this review. The populated board includes a top 20 and the current fictional learner at rank 24. Use `QAADD123` to exercise a synthetic friend request; requests and privacy changes only alter memory and reset on reload.

The narrow iframe exercises responsive CSS inside a desktop browser. It is not a physical mobile device or evidence of live account behaviour. A sandbox with isolated loopback namespaces may prevent another browser or command from reaching this server.

## CI browser smoke

```sh
npx playwright install --with-deps chromium
node tools/yo-rankings-review/smoke.mjs
```

The smoke command builds the bundle, starts the loopback server in the same process tree, checks readiness and launches Chromium. It checks all four synthetic states at 1280, 390 and 320 pixel viewport widths (English, French and Spanish respectively), checks horizontal overflow, the learner's position and nearby row, explicit participation controls, honest empty/error states, and one complete period/friends/language filter sequence. No production provider config is required.

Screenshots and `report.json` are written to ignored `.artifacts/yo-rankings/`. Twelve synthetic browser cases do not verify production authentication, database migrations, real XP awards or real friendship relationships. Those require separate authorized integration evidence. A prepared script is not a passing result until it runs successfully; locally Chromium download was unavailable, so the browser run is delegated to CI.
