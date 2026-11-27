import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Actual product components; empty-state adapter. No profiles, earned XP, friendships or APIs.
await import("./build.mjs");
const { server } = await import("./server.mjs");
const origin = "http://127.0.0.1:55857";
const output = path.resolve(".artifacts/yo-rankings");
await fs.mkdir(output, { recursive: true });
const report = { evidence: "Empty-state component browser smoke; no profiles, earned XP or friendships. Not live-account, API, migration or physical-device evidence.", checks: [], errors: [] };
const words = {
  en: { title: "A little progress. A shared adventure.", friends: "Friends", everyone: "Everyone", period: "Time period", language: "Learning language", private: "Make a place for yourself.", empty: "The adventure is just beginning.", retry: "Try again", error: "Your rankings couldn’t be loaded.", nickname: "Your nickname", join: "Join the rankings" },
  fr: { title: "Un petit progrès. Une aventure partagée.", friends: "Mes amis", everyone: "Tout le monde", period: "Période", language: "Langue apprise", private: "Fais-toi une place.", empty: "L’aventure commence ici.", retry: "Réessayer", error: "Le classement n’a pas pu être chargé.", nickname: "Ton pseudo", join: "Rejoindre le classement" },
  es: { title: "Un pequeño progreso. Una aventura compartida.", friends: "Mis amigos", everyone: "Todos", period: "Período", language: "Idioma que aprendes", private: "Hazte un lugar.", empty: "La aventura empieza aquí.", retry: "Intentar de nuevo", error: "No se pudo cargar la clasificación.", nickname: "Tu apodo", join: "Unirme a la clasificación" },
};
let browser;
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(Math.max(size.document, size.body) <= size.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(size)}`);
}
async function visibleImagesLoaded(page, label) {
  const images = await page.locator("img:visible").evaluateAll(elements => elements.map(image => ({
    src: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth,
  })));
  assert.ok(images.length > 0, `${label}: expected visible product imagery`);
  const missing = images.filter(image => !image.complete || image.width <= 0);
  assert.deepEqual(missing, [], `${label}: visible images did not load: ${JSON.stringify(missing)}`);
}
try {
  if (!server.listening) await once(server, "listening");
  const readiness = await fetch(origin, { signal: AbortSignal.timeout(5000) });
  assert.equal(readiness.status, 200, "Local empty-state server is ready");
  assert.ok(readiness.headers.get("content-security-policy")?.includes("connect-src 'none'"));
  assert.equal((await fetch(`${origin}/api/yo/rankings`)).status, 404, "No API proxy exists");
  assert.equal((await fetch(origin, { method: "POST" })).status, 405, "Server only serves static review assets");
  browser = await chromium.launch({ headless: true, timeout: 30000 });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  context.setDefaultTimeout(10000);
  await context.route("**/*", route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.errors.push(`Unexpected nonlocal request: ${route.request().url()}`);
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  // Existing empty/private/error cases at each width; one language per width.
  for (const { width, language } of [{ width: 1280, language: "en" }, { width: 390, language: "fr" }, { width: 320, language: "es" }]) {
    await page.setViewportSize({ width, height: 900 });
    const copy = words[language];
    for (const scenario of ["private", "empty", "error"]) {
      const label = `${scenario}-${language}-${width}`;
      try {
        await page.goto(`${origin}/?embed=1&lang=${language}&scenario=${scenario}`, { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: copy.title, exact: true }).waitFor();
        assert.ok(await page.getByText(/No profiles, earned XP or friend requests/).isVisible());
        assert.equal(await page.getByRole("combobox", { name: copy.language, exact: true }).locator("option").count(), 9);
        assert.ok(await page.getByRole("button", { name: copy.friends, exact: true }).isVisible());
        if (scenario === "private") {
          await page.getByRole("heading", { name: copy.private, exact: true }).waitFor();
          assert.equal(await page.locator('[data-ranking-self="true"]').count(), 0);
          assert.ok(await page.getByRole("textbox", { name: copy.nickname, exact: true }).isVisible());
          assert.ok(await page.getByRole("button", { name: copy.join, exact: true }).isVisible());
        } else if (scenario === "empty") {
          await page.getByRole("heading", { name: copy.empty, exact: true }).waitFor();
          assert.equal(await page.locator('[data-ranking-self="true"]').count(), 0);
        } else {
          await page.getByRole("alert").waitFor();
          assert.ok((await page.getByRole("alert").textContent()).includes(copy.error));
          await page.getByRole("button", { name: copy.retry, exact: true }).click();
          await page.getByRole("alert").waitFor();
          assert.equal(await page.getByRole("heading", { name: copy.empty, exact: true }).count(), 0);
        }
        await noOverflow(page, label);
        await visibleImagesLoaded(page, label);
        await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true, animations: "disabled" });
        // One browser interaction sequence suffices; the contract suite covers all filter/action combinations.
        if (scenario === "empty" && width === 1280) {
          await page.getByRole("combobox", { name: copy.period, exact: true }).selectOption("all");
          await page.getByRole("heading", { name: copy.empty, exact: true }).waitFor();
          await page.getByRole("button", { name: copy.friends, exact: true }).click();
          await page.getByRole("heading", { name: "Learning feels good together.", exact: true }).waitFor();
          await page.getByRole("combobox", { name: copy.language, exact: true }).selectOption("zh");
          await page.getByRole("heading", { name: "Learning feels good together.", exact: true }).waitFor();
          assert.equal(await page.locator('[data-ranking-self="true"]').count(), 0);
          await noOverflow(page, "selected friend/language filters");
        }
        report.checks.push({ scenario, language, width, screenshot: `${label}.png`, result: "passed" });
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${label}-failure.png`), fullPage: true, animations: "disabled" }).catch(() => {});
        throw new Error(`${label}: ${error.message}`, { cause: error });
      }
    }
  }
  assert.deepEqual(report.errors, [], "No script errors or external requests");
  console.log(`PASS ${report.checks.length} empty-state browser cases; screenshots: ${output}`);
} catch (error) {
  report.errors.push(error.stack ?? String(error));
  process.exitCode = 1;
  console.error(error);
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
