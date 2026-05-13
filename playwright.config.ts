import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Pratiqo end-to-end tests.
 *
 * Layers:
 *  - `e2e/smoke/`     — unauthenticated marketplace UI checks. Always run.
 *  - `e2e/journeys/`  — full happy-path flows (search → book intro → pay →
 *                       message → review). Each spec self-skips unless
 *                       E2E_AUTH=1 and the required secrets are set.
 *
 * Base URL:
 *   Defaults to http://localhost:3000 with `next start` (production build)
 *   auto-launched via `webServer` below. Override via PLAYWRIGHT_BASE_URL
 *   to point at a staging or production deployment.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "on-failure" }]],
  outputDir: "./test-results/e2e",

  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: isCI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
    locale: "fr-CA",
    timezoneId: "America/Montreal",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // When PLAYWRIGHT_BASE_URL is set we assume the caller already has a server
  // running (staging/prod). Otherwise auto-launch `next start` after a build.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !isCI,
        stdout: "pipe",
        stderr: "pipe",
      },
});
