<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 app (Pratiqo, a teacher marketplace) backed by Supabase + Stripe. Standard commands live in `package.json` (`dev`, `build`, `lint`, and the many `test:*` scripts) and setup is documented in `README.md` / `docs/environment.md`.

- Run dev: `npm run dev` (Next.js 16 + Turbopack, serves on port 3000). The required secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are injected as env vars, so no `.env.local` is needed for the app to boot. All other env vars (Resend, Anthropic, Maps, PostHog, Sentry, Upstash) are optional and the code no-ops / degrades when they're unset.
- Tests are plain `tsx` scripts (no Jest/Vitest); run a group via the `test:*` scripts or a single file with `npx tsx tests/<path>.test.ts`. They are mostly source-contract assertions and run offline.
- `npm run lint` currently reports pre-existing errors (mostly `react/no-unescaped-entities`); a non-zero exit does not mean your setup is broken.
- Tailwind v4 gotcha: the auto content scanner reads ALL project files (including comments/strings) and turns any literal `font-[...]`/arbitrary-value token it finds into real CSS. A literal placeholder like `font-[var(...)]` in a comment compiles to invalid CSS and 500s every route via `app/globals.css`. Never write literal bracketed Tailwind tokens in comments/docstrings.
- Non-blocking: the marketplace card enrichment endpoint `app/api/teachers/plans` can return 500 against the connected Supabase dataset; the teacher search/listing UI still renders (falls back to the `free` plan), so a 500 there is not a search-flow failure.
