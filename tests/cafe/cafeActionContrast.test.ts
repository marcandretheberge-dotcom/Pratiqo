/** Computed browser colors, using the real Cafe stylesheet (not mocked CSS). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium, type Locator } from "playwright";

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  assert.ok(channels && channels.length >= 3, `Expected an opaque RGB color: ${color}`);
  if (channels.length === 4) assert.equal(channels[3], 1, "Do not ignore text/background transparency");
  const linear = channels.slice(0, 3).map(value => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

async function check(action: Locator, label: string) {
  const colors = await action.evaluate(element => {
    const style = getComputedStyle(element);
    return { text: style.color, background: style.backgroundColor };
  });
  const foreground = luminance(colors.text);
  const background = luminance(colors.background);
  const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  assert.ok(contrast >= 4.5, `${label}: ${contrast.toFixed(2)}:1 contrast, ${colors.text} on ${colors.background}`);
  console.log(`PASS ${label}: ${contrast.toFixed(2)}:1`);
}

async function main() {
  const css = readFileSync("components/cafe/community/community.module.css", "utf8");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      // Both variants are rendered by CafeEntranceScreen. Include the surrounding
      // page scope: testing .primary in isolation missed the inherited-link rule.
      await page.setContent(`<style>${css}</style><main class="page cinematic"><section class="screen" data-cafe-step="entrance">
        <a class="primary" href="#sign-in">Entrer</a><button class="primary" type="button">Entrer</button>
      </section></main>`);
      for (const role of ["link", "button"] as const) {
        const action = page.getByRole(role, { name: "Entrer", exact: true });
        await check(action, `${width}px ${role} default`);
        await action.hover();
        await page.waitForTimeout(180);
        await check(action, `${width}px ${role} hover`);
        await page.mouse.move(0, 0);
        await action.focus();
        await page.waitForTimeout(180);
        await check(action, `${width}px ${role} focus`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
