import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createPreview } from './create-preview.mjs';

const repo = process.cwd();
const output = path.resolve(process.env.YO_QA_OUTPUT ?? '.qa-results/continuity');
await mkdir(output, { recursive: true });
const requireBrowser = createRequire(path.join(process.env.YO_QA_BROWSER_ROOT, 'package.json'));
const { chromium } = requireBrowser('playwright');
const preview = await createPreview(repo);
const log = createWriteStream(path.join(output, 'preview.log'));
const server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3105'], { cwd: preview, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
const origin = 'http://127.0.0.1:3105';
const french = '/yo/langues/francais-quebec/module-1/lecon-3?lang=fr';
let browser;
const checks = [];
const errors = [];
const geometry = [];
const inlineDock = 'main aside [data-yoppo-presentation="inline"]';
const lessonContent = 'main aside:has([data-yoppo-presentation="inline"]) + div';
const settleLayout = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function inspectItalian(page, width, state, expanded, restoredControl = false) {
  await settleLayout(page);
  const layout = await page.evaluate(({ expanded, restoredControl, state }) => {
    const failures = [];
    const check = (condition, message) => { if (!condition) failures.push(message); };
    const rect = element => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const docks = document.querySelectorAll('[data-yoppo-presentation="inline"]');
    check(docks.length === 1, 'Exactly one inline coach is rendered');
    const dock = docks[0];
    const aside = dock?.closest('main aside');
    const lesson = aside?.nextElementSibling;
    if (!dock || !aside || !lesson) throw new Error('The coach must be inside the lesson aside, adjacent to its learning content');
    check(getComputedStyle(aside.parentElement).display === 'grid', 'The aside and lesson must share the reserved grid');
    const panel = dock.querySelector('section[aria-labelledby]');
    const opener = dock.querySelector('[data-testid="italian-yoppo-position"]');
    const restore = dock.querySelector(':scope > button');
    check(Boolean(panel) === expanded, 'The expected help panel visibility is rendered');
    check(Boolean(restore) === restoredControl, 'The expected restore control is rendered inside the dock');
    const viewport = document.documentElement.clientWidth;
    const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    check(pageWidth <= viewport + 1, 'The page has no horizontal overflow');
    const railBox = rect(aside), lessonBox = rect(lesson), dockBox = rect(dock);
    check(!overlaps(dockBox, lessonBox), 'The reserved coach does not overlap the lesson column or row');
    const prose = [...lesson.querySelectorAll('p')].filter(element => element.getClientRects().length > 0);
    for (const [name, element] of [['dock', dock], ['panel', panel], ['opener', opener], ['restore', restore]]) {
      if (!element) continue;
      const box = rect(element), style = getComputedStyle(element);
      check(!['fixed', 'absolute'].includes(style.position), `${name} stays in normal flow`);
      check(box.left >= railBox.left - 1 && box.right <= railBox.right + 1, `${name} stays within the aside width`);
      check(box.left >= -1 && box.right <= viewport + 1, `${name} stays within the viewport width`);
      check(element.scrollWidth <= element.clientWidth + 1, `${name} has no horizontal content overflow`);
      check(!prose.some(paragraph => overlaps(box, rect(paragraph))), `${name} does not cover lesson prose`);
    }
    if (panel) check(rect(panel).bottom <= dockBox.bottom + 1, 'The dock reserves the full expanded panel height');
    if (state === 'scrolled-prose') {
      const paragraph = [...lesson.querySelectorAll('p[lang="it"]')].find(element => element.getClientRects().length > 0);
      check(Boolean(paragraph), 'The Italian reading paragraph exists');
      if (paragraph) {
        const box = rect(paragraph);
        const top = Math.max(box.top, 100), bottom = Math.min(box.bottom, innerHeight - 100);
        check(bottom > top, 'Lesson prose remains in the viewport after scrolling');
        if (bottom > top) {
          const hit = document.elementFromPoint((box.left + box.right) / 2, (top + bottom) / 2);
          check(Boolean(hit && (hit === paragraph || paragraph.contains(hit))), 'Scrolled lesson prose receives pointer hits without the coach covering it');
        }
      }
    }
    return { failures, viewport, pageWidth, scrollY, rail: railBox, dock: dockBox, lesson: lessonBox, lessonDocumentTop: lessonBox.top + scrollY, panel: panel ? rect(panel) : null, restore: restore ? rect(restore) : null };
  }, { expanded, restoredControl, state });
  geometry.push({ width, state, ...layout });
  assert.deepEqual(layout.failures, [], `Italian ${width}px ${state} geometry`);
  return layout;
}
try {
  const deadline = Date.now() + 90_000;
  let ready = false;
  while (Date.now() < deadline && server.exitCode === null) {
    try { const response = await fetch(origin + french); if (response.status === 200) { ready = true; break; } } catch {}
    await delay(300);
  }
  assert.ok(ready, 'The isolated real-route preview must start successfully');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + french, { waitUntil: 'networkidle' });
  const activeNavigator = () => page.locator('[data-yo-step-navigator="true"]:visible');
  await activeNavigator().locator('[data-yo-step-navigator-dot-id="best-opener"]').click();
  await activeNavigator().getByRole('button', { name: 'Aurais-tu deux minutes? J’aurais une question.', exact: true }).click();
  assert.equal(await activeNavigator().getByRole('status').innerText(), 'Bonne amorce.');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await activeNavigator().getAttribute('data-yo-step-navigator-current'), '2');
  assert.equal(await activeNavigator().getByRole('status').innerText(), 'Bonne amorce.');
  await page.screenshot({ path: path.join(output, 'french-mobile-answer.png'), fullPage: true });
  await activeNavigator().getByRole('button', { name: 'Hé!', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await activeNavigator().getAttribute('data-yo-step-navigator-current'), '2');
  assert.match(await activeNavigator().getByRole('status').innerText(), /Trop direct ou trop long/);
  checks.push('French answer, feedback and current step survive desktop → mobile → desktop');
  await activeNavigator().getByRole('button', { name: 'Ouvrir Yoppo', exact: true }).click();
  await page.getByRole('button', { name: 'Revenir à ma leçon', exact: true }).click();
  assert.match(await activeNavigator().getByRole('status').innerText(), /Trop direct ou trop long/);
  checks.push('French answer remains after a Yoppo help round trip');
  await page.screenshot({ path: path.join(output, 'french-desktop-answer.png'), fullPage: true });

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/yo/langues/italien/parcours/u01?lang=fr', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Ouvrir Yoppo', exact: true }).waitFor();
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo({ top: 0, behavior: 'instant' }); });
    const closed = await inspectItalian(page, width, 'closed', false);
    await page.screenshot({ path: path.join(output, `italian-${width}.png`), fullPage: true });
    const dock = page.locator(inlineDock);
    await dock.getByRole('button', { name: 'Ouvrir Yoppo', exact: true }).click();
    const panel = dock.getByRole('region', { name: 'On joue ensemble ?', exact: true });
    await panel.waitFor();
    const opened = await inspectItalian(page, width, 'open', true);
    if (width < 1024) assert.ok(opened.lessonDocumentTop >= closed.lessonDocumentTop + opened.panel.height - 2, `Italian ${width}px opening help must push lesson content down`);
    await page.screenshot({ path: path.join(output, `italian-${width}-open.png`), fullPage: true });
    // Exercise the panel's own scroll area and ensure its final action is reachable.
    const scroll = await panel.evaluate(element => { element.scrollTop = element.scrollHeight; return { top: element.scrollTop, max: element.scrollHeight - element.clientHeight }; });
    assert.ok(scroll.top >= scroll.max - 1, `Italian ${width}px help can scroll to its final action`);
    await panel.getByRole('button', { name: /Défie-moi/ }).click({ trial: true });
    // A real lesson action must remain clickable while help is open; then inspect reading prose after page scroll.
    const lesson = page.locator(lessonContent);
    await lesson.getByRole('button', { name: '2. La scène', exact: true }).click();
    await settleLayout(page);
    const reading = lesson.locator('p[lang="it"]:visible').first();
    await reading.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await inspectItalian(page, width, 'scrolled-prose', true);
    await page.screenshot({ path: path.join(output, `italian-${width}-reading.png`) });
    await panel.getByRole('button', { name: 'Masquer Yoppo', exact: true }).click();
    const restore = dock.getByRole('button', { name: 'Retrouver Yoppo', exact: true });
    await restore.waitFor();
    await inspectItalian(page, width, 'hidden-restore', false, true);
    await restore.click();
    await panel.waitFor();
    await inspectItalian(page, width, 'restored-open', true);
    assert.equal(await panel.getByRole('heading', { name: 'On joue ensemble ?', exact: true }).evaluate(element => element === document.activeElement), true, 'Restoring help returns focus to its heading');
    await page.screenshot({ path: path.join(output, `italian-${width}-restored.png`), fullPage: true });
    checks.push(`Italian ${width}px open, scrolled and restored help stays in its reserved rail without prose overlap or horizontal overflow`);
  }
  assert.deepEqual(errors, [], 'The inspected lesson flows must have no uncaught page errors');
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, checks, errors, geometry }, null, 2));
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: false, checks, errors, geometry, failure: String(error) }, null, 2));
  throw error;
} finally {
  try { await browser?.close(); }
  finally {
    if (server.exitCode === null && server.signalCode === null) {
      await new Promise(resolve => {
        let forceTimer, closeTimer;
        const finish = () => { clearTimeout(forceTimer); clearTimeout(closeTimer); server.off('close', finish); resolve(); };
        server.once('close', finish);
        server.kill('SIGTERM');
        forceTimer = setTimeout(() => server.kill('SIGKILL'), 5_000);
        closeTimer = setTimeout(finish, 7_000);
      });
    }
    // Unpipe even on the bounded fallback before ending the shared log stream.
    server.stdout.unpipe(log); server.stderr.unpipe(log);
    await new Promise(resolve => log.end(resolve));
  }
}
