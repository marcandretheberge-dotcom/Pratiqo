<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 app (`pratiqo`). Two products share the codebase: **Pratiqo** (teacher marketplace, under `app/(app)/*` + marketing routes — needs real Supabase + Stripe) and **YoPratiqo** (self-paced language lessons under `app/yo/*` — static content + pre-generated audio, runs without real backend). There are no separate worker/cron processes locally; cron is just API routes triggered by external schedulers in prod. Standard commands live in `package.json` scripts and `README.md`.

- **Run dev with webpack, not Turbopack:** use `npx next dev --webpack`. The default `npm run dev` (`next dev`) uses Turbopack, which miscompiles the arbitrary Tailwind utility `font-[var(--yo-app-display)]` in `app/globals.css` and returns HTTP 500 on every route (CSS parse error: `Unexpected token Delim('.')`). The committed `experimental.forceSwcTransforms` is a webpack-era option, confirming webpack is the intended dev bundler.
- **Env vars are mandatory to render any page:** the global `AuthProvider` calls `getSupabaseClient()`, which throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing — with neither set, *no* page renders. Placeholder values (e.g. `https://placeholder.supabase.co` + any string) are enough to boot and fully exercise the static YoPratiqo lesson UI (quizzes, flashcards). Real Supabase/Stripe credentials are required for auth, data, the marketplace flows, and audio playback. Put values in `.env.local` (gitignored; template is `.env.example`).
- **In-browser dev UI is blocked by CSP without a temporary tweak:** the committed CSP (`next.config.ts`) `script-src` omits `'unsafe-eval'`, which webpack dev mode (HMR + client hydration) needs, so pages render blank/non-interactive in a browser locally even though the server returns 200. To manually test interactivity in a browser, temporarily add `'unsafe-eval'` to the `script-src` directive in `next.config.ts` and restart the dev server — **do not commit this change** (production JS does not use eval).
- **Tests are standalone `tsx` scripts**, grouped behind `npm run test:*` targets (e.g. `test:yo-foundation`, `test:auth`, `test:payments`); they do not need a running server or database. Lint is `npm run lint` (eslint). Note: the committed code currently has pre-existing eslint errors and at least one stale source-content assertion in `test:auth`; these are not environment problems.
