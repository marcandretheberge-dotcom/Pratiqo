# Sentry — error tracking + performance

Wiring (Phase 0, item 5). One Sentry project (`org=pratiqo`, `project=javascript-nextjs`) covers all three runtimes (browser / node / edge) plus the Stripe webhook.

## Files

| File | Runtime | Purpose |
|---|---|---|
| `sentry.client.config.ts` | Browser | Init for browser bundle. Session Replay off (privacy). |
| `sentry.server.config.ts` | Node.js | Init for server routes + RSC. 10% trace sampling. |
| `sentry.edge.config.ts` | Edge | Init for edge routes + proxy.ts. Tracing off. |
| `instrumentation.ts` | All | Dispatches the right init at boot. Exports `onRequestError` for route-handler throws. |
| `next.config.ts` | Build | Wrapped with `withSentryConfig({...})` so source maps upload + releases are created when `SENTRY_AUTH_TOKEN` is set. |

## Environment variables

| Variable | Where it's used | Required? |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | All three runtimes at boot | **Yes** — without it the SDK no-ops |
| `SENTRY_DSN` | Server fallback if you don't want the DSN public | No |
| `SENTRY_AUTH_TOKEN` | Build-time in `withSentryConfig` only — uploads source maps + creates releases | Recommended in Production + Preview |
| `NEXT_PUBLIC_VERCEL_ENV` | Used as the `environment` tag (`production` / `preview` / `development`) | Auto-set by Vercel |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | Used as the `release` tag | Auto-set by Vercel |

## Token scopes (least privilege)

When creating the auth token in Sentry:

| Category | Level |
|---|---|
| Project | Read |
| Team | No Access |
| Release | **Admin** |
| Issue & Event | No Access |
| Organization | Read |
| Member | No Access |
| Alerts | No Access |

Resolves to `project:read`, `project:releases`, `org:read`.

## Stripe webhook coverage

`app/api/stripe/webhook/route.ts` has three explicit `Sentry.captureException` calls plus event-level tagging:

1. **Signature verification failure** — captured as `level: "warning"` with `surface: stripe.webhook, phase: signature_verify`. Fires on misconfigured webhook secret, replay attacks, or webhook URL changes.
2. **Ledger upsert failure** — captured with full `booking_payment` context (booking id, payment intent id, amount, fee, charge id). This is the "Stripe says paid, our DB doesn't agree" path and is by far the most important to surface fast.
3. **Top-level handler exception** — captured with full `stripe_event` context (event id, type, livemode, api_version). Catches anything not caught downstream.

Every event also sets the tags `stripe.event_type` and `stripe.event_id` on the scope before handler dispatch, so Sentry's grouping works at the event-type level.

## CSP

Sentry ingest endpoints are allow-listed in `next.config.ts`:

```
connect-src ... https://*.ingest.sentry.io https://*.ingest.us.sentry.io
```

Both the enforcing policy and the Report-Only candidate include them.

## Verifying the pipeline

A non-production-only probe lives at `app/api/debug/sentry/route.ts`. In `production` it returns 404; in `preview` / `development` it can trigger three failure modes:

```bash
# Uncaught throw (tests instrumentation.ts -> onRequestError)
curl https://your-preview.vercel.app/api/debug/sentry

# Explicit captureException
curl https://your-preview.vercel.app/api/debug/sentry?mode=capture

# captureMessage (info level)
curl https://your-preview.vercel.app/api/debug/sentry?mode=message
```

Each call should appear in Sentry's **Issues** view within ~30 s. If they don't:

- Confirm `NEXT_PUBLIC_SENTRY_DSN` is set in the environment that built the deployment.
- Open DevTools → Network → look for a successful POST to `*.ingest.sentry.io`.
- Check Vercel function logs for `[sentry]` warnings from the `withSentryConfig` `errorHandler`.

## Local development

Sentry is **off by default locally** because `.env.example` ships `NEXT_PUBLIC_SENTRY_DSN=` (empty). Set it in `.env.local` if you want to send events from local dev. Source maps don't need uploading locally — leave `SENTRY_AUTH_TOKEN` unset in `.env.local`.

## What's NOT wired (deliberate)

- **Session Replay** — captures user input which is a privacy concern for a marketplace handling PII. Re-enable behind a separate toggle if the value outweighs the data exposure.
- **Tunnel route** (`/monitoring`) — adds a server-side proxy to bypass adblockers. Defer until we measure meaningful adblock drop-off.
- **React component name annotation** — slows down builds slightly; we don't use the data.
- **Per-route tracesSampler** — using flat 10% sampling. Tune up specific routes later if their traces become important.
