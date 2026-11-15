import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.CAFE_STATIC_BASE || 'http://127.0.0.1:4173';
const out = 'artifacts/cafe-praktikos-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const overflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
try {
  for (const width of [1280, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [], serviceRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => { if (/supabase|daily\.co|\/api\/cafe/.test(req.url())) serviceRequests.push(req.url()); });
    await page.goto(base + '/?lang=en');
    const enter = page.getByRole('button', { name: 'Enter', exact: true });
    await enter.waitFor();
    assert.equal(await enter.isEnabled(), true, 'Entry is not gated on animation');
    const text = page.locator('[data-cafe-praktikos-text]');
    const slot = page.locator('[data-cafe-praktikos-slot]');
    const video = page.locator('video');
    await page.locator('[data-cafe-praktikos="live"]').waitFor();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await video.evaluate(v => !v.paused && v.readyState >= 2 && v.currentTime > .1)) break;
      await page.waitForTimeout(100);
    }
    assert.equal(await video.evaluate(v => !v.paused && v.readyState >= 2), true, 'Approved MP4 decodes and plays');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { window.__originalCafeVideo = document.querySelector('video'); });
    const box = await slot.boundingBox();
    const seen = [];
    const deadline = Date.now() + 31000;
    while (Date.now() < deadline && seen.length < 11) {
      const word = (await text.textContent()).trim();
      if (seen.at(-1) !== word) {
        seen.push(word);
        const next = await slot.boundingBox();
        assert.deepEqual(next, box, 'Typography slot does not shift');
        assert.equal(await text.count(), 1, 'Only one copy item is mounted');
      }
      await page.waitForTimeout(100);
    }
    assert.deepEqual(seen.slice(0, 10), ['Pratiquer','Practice','Practicar','Praticare','Praticar','Praktizieren','Une racine. Mille langues.','Le plaisir de pratiquer.','Pas besoin de parler parfaitement.','Viens pratiquer.']);
    assert.equal(seen[10], 'Praktykować', 'The next loop changes the curated selection');
    assert.equal(await page.evaluate(() => document.querySelector('video') === window.__originalCafeVideo), true);
    await page.getByRole('button', { name: 'Pause rotating words', exact: true }).click();
    const pausedWord = await text.textContent();
    const timeBefore = await video.evaluate(v => v.currentTime);
    await page.waitForTimeout(2200);
    assert.equal(await text.textContent(), pausedWord);
    assert.equal(await video.evaluate(v => v.paused), false, 'Pausing words does not pause video');
    assert.notEqual(await video.evaluate(v => v.currentTime), timeBefore);
    await page.getByRole('button', { name: 'Resume rotating words', exact: true }).click();
    await overflow(page);
    await page.screenshot({ path: `${out}/${width}-entrance.png`, fullPage: true });
    await enter.click();
    await page.getByRole('heading', { name: 'Which language are we practising?' }).waitFor();
    await overflow(page);
    await page.getByLabel('Your Café name').fill('Review visitor');
    const native = page.getByRole('group', { name: 'Native language(s)' });
    await native.getByRole('searchbox').fill('French');
    await native.getByRole('checkbox', { name: 'French', exact: true }).check();
    const learning = page.getByRole('group', { name: 'Language(s) to practise' });
    await learning.getByRole('searchbox').fill('Italian');
    await learning.getByRole('checkbox', { name: 'Italian', exact: true }).check();
    await page.getByRole('checkbox', { name: 'I confirm I am 18 or older.' }).check();
    await page.getByRole('checkbox', { name: 'I agree to the Café rules.' }).check();
    await page.screenshot({ path: `${out}/${width}-languages.png`, fullPage: true });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('heading', { name: 'Inside the Café', exact: true }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Practice language' }).inputValue(), 'it');
    await overflow(page);
    await page.screenshot({ path: `${out}/${width}-lobby.png`, fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(serviceRequests, []);
    results.push({ width, passed: true, copySequence: seen, continuousFilm: true, languageJourney: true, errors, serviceRequests });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(base + '/?lang=en');
  await page.locator('[data-cafe-praktikos="static"]').waitFor();
  assert.equal((await page.locator('[data-cafe-praktikos-text]').textContent()).trim(), 'Viens pratiquer.');
  assert.equal(await page.getByRole('button', { name: 'Pause rotating words' }).count(), 0);
  assert.equal(await page.locator('video').getAttribute('src'), null);
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await page.getByRole('heading', { name: 'Which language are we practising?' }).waitFor();
  await context.close();
  results.push({ reducedMotion: true, staticCopy: true, immediateEntry: true });
  console.log(JSON.stringify({ ok: true, fixtureOnly: true, results }, null, 2));
  await writeFile(`${out}/report.json`, JSON.stringify({ ok: true, fixtureOnly: true, results }, null, 2));
} finally { await browser.close(); }
