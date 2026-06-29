<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This repo is a single Next.js 16 app (Turbopack) with two products:
- **Pratiqo** — teacher marketplace (Supabase/Postgres + Stripe Connect + Google auth). Most app routes are server-rendered on demand and depend on Supabase/Stripe for real data.
- **YoPratiqo** (`/yo`) — self-paced language-learning product. Lesson content is static (no Stripe/bookings), so it runs fully in a logged-out state without real backend secrets.

Standard commands live in `package.json` `scripts` and the README; use those. Key ones: `npm run dev` (port 3000), `npm run build`, `npm run lint`, and the many `tsx`-based suites (`npm run test:auth`, `test:payments`, `test:security`, `test:launch-critical`, `validate:launch`, etc.). The test suites are source/static-analysis based and do **not** need a live database.

Non-obvious gotchas (verified during setup):
- **`.env.local` is required to render any page in the browser.** `AuthProvider` (wraps every route via `app/providers.tsx`) calls `getSupabaseClient()` in a mount effect, which throws unless `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set — otherwise the app's error boundary renders "Une erreur est survenue". Placeholder values are enough to boot and exercise the `/yo` content product (logged-out "no session" state); real Supabase + Stripe secrets are needed for auth, the marketplace, bookings, and payments. See `docs/environment.md` and `.env.example`.
- **`NEXT_PUBLIC_*` vars are inlined at build time.** After editing `.env.local`, `npm run dev` picks them up on restart, but `npx next start` requires a fresh `npm run build` first.
- **Browser interactivity in `npm run dev` is blocked by CSP.** The enforced Content-Security-Policy in `next.config.ts` (`script-src`) omits `'unsafe-eval'`, which React's dev runtime needs. `npm run dev` compiles and serves HTML (200), but the browser blocks client hydration with a CSP error overlay. To click through the app in a browser, use a production build (`npm run build` then `npx next start`) — production React doesn't need eval — or relax the CSP locally. Server-side checks (curl, build, tests) are unaffected.
- `npm run lint` currently reports pre-existing errors in app source (React Compiler rules, unescaped entities); the lint tooling itself works.
