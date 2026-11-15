import { chromium } from "playwright";
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const base = "https://www.pratiqo.ca";
const out = join("artifacts", "cafe-public-entrance");
mkdirSync(out, { recursive: true });

async function dismissConsent(page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (!(await banner.isVisible().catch(() => false))) return;
  for (const name of [/Accepter/i, /Accept/i, /Aceptar/i, /Nécessaires|Necessary/i]) {
    const button = banner.getByRole("button", { name });
    if (await button.isVisible().catch(() => false)) {
      await button.click({ force: true });
      break;
    }
  }
  await banner.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
}

async function pick(page, group, query) {
  await dismissConsent(page);
  const search = group.locator('input[type="search"]');
  await search.fill(query);
  const option = group.locator("label").filter({ hasText: new RegExp(query, "i") }).first();
  await option.waitFor({ state: "visible", timeout: 10_000 });
  const checkbox = option.locator('input[type="checkbox"]');
  if (!(await checkbox.isChecked())) {
    await checkbox.evaluate((element) => element.click());
  }
  await search.fill("");
}

async function run(browser, label, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "fr-CA" });
  await context.addInitScript({ content: `localStorage.setItem("pratiqo-locale", "fr");` });
  const page = await context.newPage();
  const apis = [];
  page.on("request", (request) => {
    if (/\/api\/cafe(\/|$)/.test(request.url())) apis.push(request.url());
  });

  await page.goto(`${base}/cafe?language=it`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dismissConsent(page);
  await page.locator('[data-cafe-step="entrance"]').waitFor({ state: "visible" });
  const video = page.locator('[data-cafe-hero="video-enabled"] video');
  await video.waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
  const playing = await video.evaluate((element) => !element.paused && element.readyState >= 2);
  await page.screenshot({ path: join(out, `${label}-entrance.png`), fullPage: true });

  await page.locator('[data-cafe-step="entrance"]').getByRole("button", { name: /Entrer|Enter|Entrar/ }).evaluate((el) => el.click());
  await page.locator('[data-cafe-step="language"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.screenshot({ path: join(out, `${label}-language.png`), fullPage: true });

  const practice = page.getByRole("group", { name: /pratiquer|practise|practicar/i });
  const native = page.getByRole("group", { name: /maternelle|Native|materna/i });
  // Clear Italian course hint if selected, then choose French.
  const selected = practice.locator('input[type="checkbox"]:checked');
  while ((await selected.count()) > 0) {
    await selected.first().evaluate((el) => el.click());
  }
  await pick(page, practice, "fran");
  await pick(page, native, "fran");
  await dismissConsent(page);
  await page.getByRole("button", { name: /Continuer|Continue|Continuar/ }).evaluate((el) => el.click());
  await page.locator('[data-cafe-step="soon"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.screenshot({ path: join(out, `${label}-soon.png`), fullPage: true });

  await context.close();
  return { label, playing, apis, soon: true };
}

const browser = await chromium.launch({ headless: true });
const report = { ok: false, base, steps: [], videoSha256: null, createdAt: new Date().toISOString() };
try {
  report.steps.push(await run(browser, "desktop", 1280, 800));
  report.steps.push(await run(browser, "mobile-320", 320, 640));
  const buffer = Buffer.from(await (await fetch(`${base}/videos/cafe-world-journey.mp4`)).arrayBuffer());
  report.videoSha256 = createHash("sha256").update(buffer).digest("hex");
  report.ok =
    report.videoSha256 === "c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6" &&
    report.steps.every((step) => step.playing && step.apis.length === 0 && step.soon);
  writeFileSync(join(out, "live-verify.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
} finally {
  await browser.close();
}
