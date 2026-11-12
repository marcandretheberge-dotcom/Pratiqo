/**
 * Capture labeled DEMO room screenshots (desktop + mobile).
 * Requires Next listening with CAFE_V1_ENABLED=true.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";

const base = (process.env.CAFE_PR3B_BASE || "http://localhost:3465").replace(/\/$/, "");
const outDir = join("artifacts", "cafe-pr3b-room");
mkdirSync(outDir, { recursive: true });

async function capture(label: string, contextOptions: Parameters<typeof chromium.launchPersistentContext>[1] | Record<string, unknown>) {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext(contextOptions as never);
  const page = await context.newPage();
  await page.goto(`${base}/cafe/preview/salle`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByText(/DÉMO|DEMO/i).first().waitFor({ timeout: 60000 });
  const dismissOverlays = async () => {
    await page.evaluate(() => {
      document.querySelectorAll('[data-testid="cookie-consent-banner"]').forEach((el) => el.remove());
    });
  };
  const clickNamed = async (pattern: RegExp) => {
    await dismissOverlays();
    const button = page.getByRole("button", { name: pattern });
    await button.waitFor({ state: "attached", timeout: 30000 });
    await button.evaluate((el) => (el as HTMLButtonElement).click());
  };

  await dismissOverlays();
  await page.screenshot({ path: join(outDir, `${label}-welcome.png`), fullPage: true });
  await clickNamed(/Préparer caméra|Prepare camera|Preparar cámara/i);
  await page.getByRole("button", { name: /Entrer dans la salle|Enter the room|Entrar a la sala/i }).waitFor({
    state: "attached",
    timeout: 15000,
  });
  await page.screenshot({ path: join(outDir, `${label}-media-prep.png`), fullPage: true });
  await clickNamed(/Entrer dans la salle|Enter the room|Entrar a la sala/i);
  await page.getByText(/Démonstration connectée|Demo connected|Demo conectada/i).waitFor({ timeout: 30000 });
  await page.screenshot({ path: join(outDir, `${label}-connected.png`), fullPage: true });
  await clickNamed(/Quitter la salle|Leave the room|Salir de la sala/i);
  await page.getByText(/quitté la salle|left the room|salido de la sala/i).waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(outDir, `${label}-left.png`), fullPage: true });
  await browser.close();
}

void (async () => {
  await capture("desktop", { viewport: { width: 1280, height: 800 } });
  await capture("mobile", { ...devices["iPhone 13"] });
  console.log(JSON.stringify({ ok: true, outDir, base }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
