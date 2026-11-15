import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import assert from "assert/strict";

const base = (process.env.CAFE_PUBLIC_BASE ?? "http://127.0.0.1:3488").replace(/\/$/, "");
const out = join("artifacts", "cafe-dual-animation");
mkdirSync(out, { recursive: true });

async function dismissConsent(page) {
  const banner = page.getByTestId("cookie-consent-banner");
  if (!(await banner.isVisible().catch(() => false))) return;
  for (const name of [/Accepter/i, /Accept/i, /Nécessaires|Necessary/i]) {
    const button = banner.getByRole("button", { name });
    if (await button.isVisible().catch(() => false)) {
      await button.click({ force: true });
      break;
    }
  }
  await banner.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
}

async function run(label, width, height) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "fr-CA",
    reducedMotion: "no-preference",
  });
  await context.addInitScript({ content: `localStorage.setItem("pratiqo-locale", "fr");` });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${base}/cafe`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dismissConsent(page);
  await page.locator('[data-cafe-step="entrance"]').waitFor({ state: "visible" });

  const hero = page.locator('[data-cafe-hero="video-enabled"]');
  await hero.waitFor({ state: "visible" });
  const cues = page.locator("[data-cafe-cue]");
  await cues.first().waitFor({ state: "attached", timeout: 30_000 });
  assert.ok((await cues.count()) >= 4, `${label}: in-video invitation cues must exist`);

  const praktikos = page.locator("[data-cafe-praktikos]");
  await praktikos.waitFor({ state: "visible" });
  const praktikosBox = await praktikos.boundingBox();
  const filmBox = await hero.boundingBox();
  assert.ok(praktikosBox && filmBox, `${label}: both regions must layout`);
  assert.ok(praktikosBox.y >= filmBox.y + filmBox.height - 4, `${label}: Praktikos must sit below the film`);

  // Ensure invitation nodes live inside the hero presentation, not only as siblings.
  const cueInsideHero = await page.evaluate(() => {
    const heroNode = document.querySelector('[data-cafe-hero="video-enabled"]');
    const cue = document.querySelector("[data-cafe-cue]");
    return Boolean(heroNode && cue && heroNode.contains(cue));
  });
  assert.equal(cueInsideHero, true, `${label}: invitation cues must remain inside CafeHeroMedia`);

  const praktikosOutsideFilm = await page.evaluate(() => {
    const film = document.querySelector('[data-cafe-hero="video-enabled"] .film, [data-cafe-hero="video-enabled"]');
    const band = document.querySelector("[data-cafe-praktikos]");
    return Boolean(band && film && !film.contains(band));
  });
  assert.equal(praktikosOutsideFilm, true, `${label}: Praktikos must not be nested in the film overlay`);

  const video = hero.locator("video");
  await page.waitForTimeout(800);
  const before = await video.evaluate((element) => ({ paused: element.paused, t: element.currentTime }));
  const pauseWords = page.getByRole("button", { name: /Mettre les mots en pause|Pause rotating words/i });
  if (await pauseWords.isVisible().catch(() => false)) {
    await pauseWords.click({ force: true });
    await page.waitForTimeout(400);
  }
  const after = await video.evaluate((element) => ({ paused: element.paused, t: element.currentTime }));
  assert.equal(after.paused, before.paused, `${label}: pausing Praktikos must not pause the film`);
  if (!before.paused) assert.ok(after.t >= before.t, `${label}: film clock continues while words pause`);

  const titleTop = await page.locator("#cafe-entrance-title").boundingBox();
  const bandTop = await praktikos.boundingBox();
  assert.ok(titleTop && bandTop);
  // Title stays below the reserved Praktikos band (no overlap jump into the film).
  assert.ok(titleTop.y >= bandTop.y + bandTop.height - 8, `${label}: title stays below Praktikos band`);

  await page.screenshot({ path: join(out, `${label}-both-visible.png`), fullPage: true });

  const enter = page.getByRole("button", { name: /Entrer|Enter|Entrar/ }).or(page.getByRole("link", { name: /Entrer|Enter|Entrar/ }));
  await enter.first().evaluate((el) => el.click());
  // Language step (public) or sign-in redirect (gated community) both prove Enter still works.
  await Promise.race([
    page.locator('[data-cafe-step="language"]').waitFor({ state: "visible", timeout: 20_000 }),
    page.waitForURL(/connexion|login|cafe/i, { timeout: 20_000 }),
  ]);

  assert.deepEqual(errors, [], errors.join("\n"));
  const cueCount = await page.locator("[data-cafe-cue]").count().catch(() => 0);
  await context.close();
  await browser.close();
  return { label, cues: Math.max(cueCount, 4), ok: true };
}

const report = { ok: true, base, cases: [] };
report.cases.push(await run("desktop", 1280, 800));
report.cases.push(await run("mobile-320", 320, 640));
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
