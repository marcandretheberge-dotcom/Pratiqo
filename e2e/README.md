# E2E tests (Playwright)

Two suites under `e2e/`:

| Folder       | Auth | Stripe | Runs in CI                 |
| ------------ | ---- | ------ | -------------------------- |
| `smoke/`     | none | none   | Every PR (`e2e.yml` job)   |
| `journeys/`  | yes  | yes    | Only when `E2E_AUTH=1`     |

## Run locally

```bash
npm install
npx playwright install chromium --with-deps   # one-time
npm run test:e2e        # builds + starts the app, runs the smoke suite
```

To target an existing deployment (skip the auto-built server):

```bash
PLAYWRIGHT_BASE_URL=https://www.pratiqo.ca npm run test:e2e
```

Open the HTML report after a run:

```bash
npx playwright show-report
```

## Authenticated / payment journeys

The `journeys/` suite needs seeded accounts and Stripe test keys. Provide:

```bash
E2E_AUTH=1
E2E_STUDENT_EMAIL=...
E2E_STUDENT_PASSWORD=...
E2E_TEACHER_EMAIL=...
E2E_TEACHER_PASSWORD=...
E2E_STRIPE_TEST_CARD=4242424242424242   # optional, defaults to this
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

Each spec under `journeys/` self-skips when these envs are missing, so CI
stays green for contributors without the full stack. Once the seeding
contract is finalized, flip `E2E_AUTH=1` for the `e2e-auth.yml` job to
exercise the full search → book → pay → message → review path.

## Authoring guidelines

- Prefer accessible selectors (`getByRole`, `getByLabel`) over class names.
- Don't write to production DBs from `smoke/`. The suite must be safe to
  run against `https://www.pratiqo.ca`.
- Both populated and empty states are valid outcomes for marketplace
  search; assert structural anchors (e.g. `#student-search-results`)
  rather than specific teacher counts.
- Stripe Checkout selectors drift; prefer the embedded Payment Element
  whenever a flow supports it.
