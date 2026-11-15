/**
 * Application browser coverage for /cafe with community gates OFF.
 * Not a fixture demo: exercises the real Next route and public entrance.
 *
 * Usage:
 *   CAFE_PUBLIC_BASE=http://127.0.0.1:3475 npx tsx scripts/cafe-public-entrance-browser.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const base = (process.env.CAFE_PUBLIC_BASE ?? "http://127.0.0.1:3475").replace(/\/$/, "");
const outDir = join("artifacts", "cafe-public-entrance");
mkdirSync(outDir, { recursive: true });

async function dismissConsent(page: Page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (!(await banner.isVisible().catch(() => false))) return;
  const candidates = [
    banner.getByRole("button", { name: /Accepter/i }),
    banner.getByRole("button", { name: /Accept/i }),
    banner.getByRole("button", { name: /Aceptar/i }),
    banner.getByRole("button", { name: /Nécessaires|Necessary|Solo necesarias/i }),
  ];
  for (const button of candidates) {
    if (await button.isVisible().catch(() => false)) {
      await button.click({ force: true });
      break;
    }
  }
  await banner.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
}

async function noOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, label: document.title };
  });
  assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${label}: horizontal overflow`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const apiHits: string[] = [];
  const runtimeErrors: string[] = [];

  try {
    for (const [label, width, height] of [
      ["desktop", 1280, 800],
      ["mobile-320", 320, 640],
    ] as const) {
      const context = await browser.newContext({
        viewport: { width, height },
        locale: "en-US",
        reducedMotion: "no-preference",
      });
      await context.addInitScript({ content: `localStorage.setItem("pratiqo-locale", "en");` });
      const page = await context.newPage();
      page.on("pageerror", (error) => runtimeErrors.push(`${label}:${error.message}`));
      page.on("request", (request) => {
        const url = request.url();
        if (/\/api\/cafe(\/|$)/.test(url)) apiHits.push(url);
      });

      const response = await page.goto(`${base}/cafe?language=it`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      assert.equal(response?.status(), 200);
      await dismissConsent(page);

      await page.getByRole("heading", { name: "Café des langues" }).waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Enter" }).waitFor({ state: "visible" });
      assert.equal(await page.locator('[data-cafe-step="entrance"]').count(), 1);
      assert.equal(await page.getByText(/tables disponibles|remaining spots|CaféFrontDoor/i).count(), 0);

      const video = page.locator('[data-cafe-hero="video-enabled"] video');
      await video.waitFor({ state: "visible" });
      await page.waitForTimeout(800);
      const playing = await video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2);
      assert.equal(playing, true, `${label}: approved film should play`);

      await page.getByRole("button", { name: "Enter" }).click();
      await page.getByRole("heading", { name: "Which language are we practising?" }).waitFor();

      const practice = page.getByRole("group", { name: "Language(s) to practise" });
      assert.equal(await practice.getByRole("checkbox", { name: "Italian" }).isChecked(), true);
      await practice.getByRole("checkbox", { name: "Italian" }).click();
      await practice.getByRole("checkbox", { name: "French" }).click();
      await page.getByRole("group", { name: "Native language(s)" }).getByRole("checkbox", { name: "French" }).click();
      await page.getByRole("button", { name: "Continue" }).click();

      await page.getByRole("heading", { name: "Conversations are coming soon" }).waitFor();
      assert.match(await page.getByText(/To practise/i).innerText(), /French/);
      assert.doesNotMatch(await page.getByText(/To practise/i).innerText(), /Italian/);

      await noOverflow(page, label);
      await page.screenshot({ path: join(outDir, `${label}-soon.png`), fullPage: true });
      await context.close();
    }

    // Reduced motion / keyboard smoke on desktop.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "fr-CA",
      reducedMotion: "reduce",
    });
    await context.addInitScript({ content: `localStorage.setItem("pratiqo-locale", "fr");` });
    const page = await context.newPage();
    await page.goto(`${base}/cafe`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await dismissConsent(page);
    await page.getByRole("button", { name: "Entrer" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "On pratique quelle langue ?" }).waitFor();
    await page.screenshot({ path: join(outDir, "desktop-reduced-motion-language.png"), fullPage: true });
    await context.close();

    assert.deepEqual(apiHits, [], "public path must not call private Café APIs");
    assert.deepEqual(runtimeErrors, [], runtimeErrors.join("\n"));

    const videoResponse = await fetch(`${base}/videos/cafe-world-journey.mp4`);
    assert.equal(videoResponse.ok, true);
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    assert.equal(hash, "c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6");

    writeFileSync(
      join(outDir, "browser-report.json"),
      JSON.stringify(
        {
          ok: true,
          base,
          communityApis: apiHits,
          runtimeErrors,
          videoSha256: hash,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log("cafe-public-entrance-browser: passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
