# Local empty-state ranking review

This harness renders the actual `RankingsAccount`, ranking CSS, shared header and Yoppo assets with **no profiles, earned XP, standings or friend requests**. An empty-state adapter replaces the ranking transport; account actions and Supabase/auth modules are disabled. No credentials, provider accounts, external messages or browser persistence are used. The static server only binds to `127.0.0.1:55857`; its CSP disallows network connections and it has no API proxy.

From the repository root, after `npm ci`:

```sh
node tools/yo-rankings-review/build.mjs
node tools/yo-rankings-review/server.mjs
```

Open `http://127.0.0.1:55857/` in the same machine/network namespace. Controls select French, English or Spanish; a desktop, 390 px or 320 px iframe; and private, empty or unavailable states. Product navigation is disabled in this review. The former populated leaderboard, invented identities and simulated friend actions have been removed.

The narrow iframe exercises responsive CSS inside a desktop browser. It is not a physical mobile device or evidence of live account behaviour. A sandbox with isolated loopback namespaces may prevent another browser or command from reaching this server.

## CI browser smoke

```sh
npx playwright install --with-deps chromium
node tools/yo-rankings-review/smoke.mjs
```

The smoke command builds the bundle, starts the loopback server in the same process tree, checks readiness and launches Chromium. It covers the three empty/private/unavailable states at 1280, 390 and 320 pixel viewport widths (English, French and Spanish respectively), horizontal overflow, explicit participation controls, empty/error copy, and one period/friends/language filter sequence. No production provider config is required.

Screenshots and `report.json` are written to ignored `.artifacts/yo-rankings/`. These nine component cases do not verify production authentication, database migrations, real XP awards or real friendship relationships. The cleanup was released at the owner's request without another manual test run or disposable accounts. A prepared script is not a passing result until CI runs it successfully.
