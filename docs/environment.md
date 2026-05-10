# Environment variables

Pratiqo reads configuration from **environment variables**. In local development, use **`.env.local`** at the repo root (copy from **`.env.example`**). On **Vercel**, set the same names under Project → Settings → Environment Variables.

**Never commit** `.env.local`, `.env`, or real secrets. **`.env.example`** is the template only (no real keys).

## UTF-8 and BOM

Save **`.env.local` as UTF-8 without a BOM**. Some Windows editors prepend a BOM (`U+FEFF`); the backup scripts strip it when parsing, but other tools may mis-read the first variable.

## Public vs server-only

| Prefix / pattern | Where it runs | Rule |
|------------------|---------------|------|
| `NEXT_PUBLIC_*` | Browser + server (bundled into client) | **Safe for non-secret** values only (e.g. Supabase URL + **anon** key, Maps API key). Never put service role keys or Stripe secret keys here. |
| Everything else | Server only (API routes, Server Components, scripts) | **Secrets** — must not be exposed to the client or logged. |

## Required for typical local dev

Minimum to run the app with auth and data:

- **`NEXT_PUBLIC_SUPABASE_URL`**
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**

Most server features (webhooks, admin inserts, checkout validation) also need:

- **`SUPABASE_SERVICE_ROLE_KEY`**

Payment flows need Stripe keys and checkout base URL (see **`.env.example`** Stripe section).

## Required on Vercel (production)

Align with your deployment:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_BASE_URL`
- **App URLs:** `APP_BASE_URL` (and optionally `APP_URL` / `STRIPE_CHECKOUT_BASE_URL` fallbacks used by Stripe routes)

Exact requirements depend on which features you enable (email, AI description, Maps, Upstash rate limits, etc.). See **`.env.example`** for each variable and whether it is required or optional.

## Optional highlights

- **`RESEND_API_KEY`** — without it, emails are skipped (non-fatal).
- **`ANTHROPIC_API_KEY`** — required only for `/api/ai/description`.
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** — maps UIs degrade without it.
- **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** — omit to **fail open** (no rate limiting); see `lib/rateLimit.ts`.
- **`PRATIQO_LOG_INFO`** — set to `1` to allow extra `logInfo` output in production (`lib/log.ts`).
- **PostHog / Sentry** — listed in **`.env.example`** for future use; **not** read by the current app code.

## Database backup variables

Used only by **`scripts/Backup-Database.ps1`** and **`scripts/Restore-Database.ps1`**. See **[backup-and-restore.md](./backup-and-restore.md)**.

## Full list

The authoritative, commented list is **`.env.example`** in the repository root. After pulling changes, diff your `.env.local` against `.env.example` for new keys.
