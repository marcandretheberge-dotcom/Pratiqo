/**
 * Exercise the labeled DEMO with real browser clicks and normal CSP.
 * This proves the UI only: no Daily session, Supabase fixture or media device.
 * Requires Next listening with CAFE_V1_ENABLED=true.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices, type Browser, type BrowserContextOptions } from "playwright";
import { CAFE_INVITATION_DEMO } from "../lib/cafe/practiceInvitation";

const base = (process.env.CAFE_PR3B_BASE || "http://localhost:3465").replace(/\/$/, "");
const outDir = join("artifacts", "cafe-pr3b-room");
mkdirSync(outDir, { recursive: true });

async function exercise(browser: Browser, label: string, contextOptions: BrowserContextOptions) {
  const context = await browser.newContext({ ...contextOptions, locale: "fr-CA" });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  let dailyRequests = 0;
  page.on("pageerror", (error) => runtimeErrors.push(error.name));
  page.on("request", (request) => {
    if (/(^|\.)daily\.co$/.test(new URL(request.url()).hostname)) dailyRequests += 1;
  });
  const main = page.locator("main[data-cafe-room-phase]");
  const waitForPhase = (phase: string) =>
    page.locator(`main[data-cafe-room-phase="${phase}"]`).waitFor({ timeout: 30000 });
  const prepare = () => main.getByRole("button", { name: /Préparer caméra|Prepare camera|Preparar cámara/i });
  const enter = () => main.getByRole("button", { name: /Entrer dans la salle|Enter the room|Entrar a la sala/i });
  const leave = () => main.getByRole("button", { name: /Quitter la salle|Leave the room|Salir de la sala/i });

  try {
    const response = await page.goto(`${base}/cafe/preview/salle`, {
      waitUntil: "domcontentloaded", timeout: 120000,
    });
    assert.equal(response?.status(), 200, "demo route must load");
    const headers = response!.headers();
    assert.match(headers["content-security-policy"] || "", /frame-src[^;]*https:\/\/\*\.daily\.co/);
    assert.match(headers["permissions-policy"] || "", /camera=\(self/);
    assert.match(headers["permissions-policy"] || "", /microphone=\(self/);
    assert.match(headers["permissions-policy"] || "", /display-capture=\(\)/);
    await waitForPhase("welcome");
    await main.getByText(/DÉMO|DEMO/i).first().waitFor();

    // Dismiss the actual consent UI; never remove an overlay or force a click.
    const cookieBanner = page.getByTestId("cookie-consent-banner");
    await cookieBanner.waitFor({ timeout: 30000 });
    await cookieBanner.getByRole("button", {
      name: /Nécessaires seulement|Necessary only|Solo necesarias/i,
    }).click();
    await cookieBanner.waitFor({ state: "hidden" });
    const installPrompt = page.getByRole("complementary", {
      name: /Installer Pratiqo|Install Pratiqo|Instalar Pratiqo/i,
    });
    if (await installPrompt.isVisible()) {
      await installPrompt.getByRole("button", { name: /Pas maintenant|Not now|Ahora no/i }).click();
      await installPrompt.waitFor({ state: "hidden" });
    }
    await page.screenshot({ path: join(outDir, `${label}-welcome.png`), fullPage: true });

    await prepare().click();
    await waitForPhase("media_prep");
    const toggles = main.locator("button[aria-pressed]");
    assert.equal(await toggles.count(), 2);
    assert.equal(await main.locator('button[aria-pressed="false"]').count(), 2, "media starts off");
    await toggles.nth(0).click();
    await toggles.nth(1).click();
    await main.locator('button[aria-pressed="true"]').nth(1).waitFor();
    await page.screenshot({ path: join(outDir, `${label}-media-prep.png`), fullPage: true });

    await enter().click();
    await waitForPhase("connected");
    await main.getByText(/Démonstration connectée|Demo connected|Demo conectada/i).waitFor();
    assert.equal(await main.locator("iframe").count(), 0, "the demo never creates a Daily frame");
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, `${label} must not overflow horizontally`);
    await page.screenshot({ path: join(outDir, `${label}-connected.png`), fullPage: true });

    await leave().click();
    await waitForPhase("left");
    const courseReturn = main.getByRole("link", {
      name: /Revenir à mon cours|Return to my course|Volver a mi curso/i,
    });
    assert.equal(await courseReturn.getAttribute("href"), CAFE_INVITATION_DEMO.mission.courseReturnPath);
    await page.screenshot({ path: join(outDir, `${label}-left.png`), fullPage: true });

    // A fresh entry must restore the explicit opt-in media defaults.
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPhase("welcome");
    await prepare().click();
    await waitForPhase("media_prep");
    assert.equal(await main.locator('button[aria-pressed="false"]').count(), 2);
    await enter().click();
    await waitForPhase("connected");
    await leave().click();
    await waitForPhase("left");

    assert.deepEqual(runtimeErrors, [], "the demo must hydrate and run without uncaught errors");
    assert.equal(dailyRequests, 0, "the demo must not contact Daily");
    return {
      viewport: label,
      engine: "chromium",
      simulatedDaily: true,
      realMediaDevices: false,
      checked: ["normal_csp", "media_opt_in", "enter", "leave", "fresh_entry", "course_return_href", "no_horizontal_overflow"],
      dailyRequests,
      runtimeErrors: runtimeErrors.length,
    };
  } catch (error) {
    await page.screenshot({ path: join(outDir, `${label}-failure.png`), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

void (async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const cases = [];
    cases.push(await exercise(browser, "desktop", { viewport: { width: 1280, height: 800 } }));
    cases.push(await exercise(browser, "mobile-emulation", { ...devices["iPhone 13"] }));
    const report = { kind: "real_browser_demo_ui", ok: true, notDailySessionValidation: true, cases };
    writeFileSync(join(outDir, "demo-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error: unknown) => {
  const failure = {
    kind: "real_browser_demo_ui",
    ok: false,
    notDailySessionValidation: true,
    error: error instanceof Error ? error.message : "Demo browser failed",
  };
  writeFileSync(join(outDir, "demo-report.json"), JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure));
  process.exitCode = 1;
});
