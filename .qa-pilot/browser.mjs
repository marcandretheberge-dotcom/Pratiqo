import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createPreview } from './create-preview.mjs';

const repo = process.cwd();
const requireRepo = createRequire(path.join(repo, 'package.json'));
const { italianCourseUnits, italianCourseCatalog } = requireRepo('./lib/yo/italian/course/courseData.ts');
const { adventureCopy } = requireRepo('./lib/yo/adventure.ts');
const unit = italianCourseUnits[0], nextUnit = italianCourseUnits[1], copy = adventureCopy.fr;
const output = path.resolve(process.env.YO_QA_OUTPUT ?? '.qa-results/pilot');
await mkdir(output, { recursive: true });
const requireBrowser = createRequire(path.join(process.env.YO_QA_BROWSER_ROOT, 'package.json'));
const { chromium } = requireBrowser('playwright');
const preview = await createPreview(repo);
const log = createWriteStream(path.join(output, 'preview.log'));
const server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3105'], { cwd: preview, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://audio.pilot.test' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
let serverLogTail = '';
const captureServerLog = chunk => { serverLogTail = (serverLogTail + chunk.toString()).slice(-8_000); };
server.stdout.on('data', captureServerLog); server.stderr.on('data', captureServerLog);
const origin = 'http://127.0.0.1:3105', route = '/yo/langues/italien/parcours/u01?lang=fr';
const storageKey = 'yopratiqo:italian-course:a1:v1';
const checks = [], errors = [], geometry = [];
let browser, page;
const exact = name => ({ name, exact: true });
const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), storageKey);
// Native HTMLAudio playback with a small deterministic fixture, without paid services.
// Pronunciation/content coverage is checked separately against the existing exact recordings registry.
const samples = 8_000;
const wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16_000, 24); wav.writeUInt32LE(32_000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 16_000) * 500), 44 + 2 * i);

async function answer(activity, { correct = true, assisted = false } = {}) {
  if (activity.kind === 'match') {
    for (const pair of activity.pairs) {
      await page.getByRole('group', exact('Expressions italiennes')).getByRole('button', exact(pair.it)).click();
      await page.getByRole('group', exact('Leur sens')).getByRole('button', exact(pair.meaning.fr)).click();
    }
    return;
  }
  if (activity.kind === 'order') {
    for (const word of activity.answer) await page.getByRole('group', exact('Mots disponibles')).getByRole('button', exact(word)).filter({ visible: true }).first().click();
  } else if (activity.kind === 'type') {
    if (activity.listeningText) {
      await page.getByRole('button', exact('Écouter : le message de l’exercice')).click();
      await page.getByText('Audio démarré', { exact: true }).waitFor();
    }
    await page.getByRole('textbox', exact('Ta réponse en italien')).fill(correct ? activity.model : 'xyz');
  } else {
    if (activity.kind === 'listen') {
      if (assisted) await page.getByRole('button', exact('Lire la transcription (avec aide)')).click();
      else {
        await page.getByRole('button', exact('Écouter : le message de l’exercice')).click();
        await page.getByText('✓ Audio démarré', { exact: true }).waitFor();
      }
    }
    const option = activity.options.find(item => (item.id === activity.correctId) === correct);
    await page.getByRole('group', exact('Choisis une réponse')).getByRole('button', exact(option.it ?? option.label.fr)).click();
  }
  await page.getByRole('button', exact('Vérifier')).click();
}
async function completeAssessment(assessment, options = {}) {
  for (let index = 0; index < assessment.questions.length; index++) {
    const q = assessment.questions[index];
    if (assessment.mission) {
      await page.getByTestId('course-mission-scene').getByText(assessment.mission.scenes[q.id].setting.fr, { exact: true }).waitFor();
      assert.equal(await page.getByTestId('course-mission-outcome').count(), 0, 'No outcome is disclosed before the answer');
    }
    await answer(q, { correct: !(options.wrongFirst && index === 0), assisted: options.assisted && q.kind === 'listen' });
    if (assessment.mission) {
      const expected = options.wrongFirst && index === 0 ? assessment.mission.scenes[q.id].recovery.fr : assessment.mission.scenes[q.id].success.fr;
      assert.equal(await page.getByTestId('course-mission-outcome').innerText(), expected);
    }
    if (index === 0 && options.capture) await page.screenshot({ path: path.join(output, options.capture), fullPage: true });
    await page.getByRole('button', exact(index === assessment.questions.length - 1 ? 'Voir mon résultat' : 'Question suivante')).click();
  }
}
async function inspect(width, label) {
  await page.setViewportSize({ width, height: 900 });
  const value = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const dialog = document.querySelector('dialog[open]');
    const rect = dialog?.getBoundingClientRect();
    return { viewport, pageWidth, dialog: rect ? { left: rect.left, right: rect.right, width: rect.width, scrollWidth: dialog.scrollWidth, clientWidth: dialog.clientWidth } : null };
  });
  geometry.push({ label, width, ...value });
  assert.ok(value.pageWidth <= value.viewport + 1, `${label}: no horizontal page overflow at ${width}px`);
  if (value.dialog) {
    assert.ok(value.dialog.left >= -1 && value.dialog.right <= value.viewport + 1, `${label}: dialog fits ${width}px`);
    assert.ok(value.dialog.scrollWidth <= value.dialog.clientWidth + 1, `${label}: dialog content fits ${width}px`);
  }
  await page.screenshot({ path: path.join(output, `${label}-${width}.png`), fullPage: !value.dialog });
}

try {
  const deadline = Date.now() + 90_000;
  let ready = false, lastResponse = 'No response';
  while (Date.now() < deadline && server.exitCode === null) {
    let response;
    try { response = await fetch(origin + route, { signal: AbortSignal.timeout(Math.max(1, Math.min(15_000, deadline - Date.now()))) }); }
    catch (error) { lastResponse = String(error); }
    if (response) {
      lastResponse = `HTTP ${response.status}`;
      if (response.status >= 500) throw new Error(`${lastResponse}: ${(await response.text()).slice(0, 1_500)}\n${serverLogTail}`);
      await response.body?.cancel();
      if (response.status === 200) { ready = true; break; }
    }
    await delay(300);
  }
  assert.ok(ready, `${lastResponse}\n${serverLogTail}`);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  await context.route('https://audio.pilot.test/**', async route => route.fulfill({ status: 200, contentType: 'audio/wav', body: wav, headers: { 'access-control-allow-origin': '*' } }));
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + route, { waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('button', exact('Halte de mi-parcours')).isDisabled(), true);
  assert.equal(await page.getByRole('checkbox', exact(copy.effects)).isChecked(), false);
  const practice = unit.lessons.flatMap(lesson => lesson.activities.map(activity => ({ lesson, activity }))).slice(0, 10);
  for (const [index, { lesson, activity }] of practice.entries()) {
    await page.goto(origin + route + `&lecon=${lesson.id}&activite=${activity.id}`, { waitUntil: 'networkidle' });
    await answer(activity);
    await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key) ?? '{}').activities?.[id]?.independent === true, { key: storageKey, id: activity.id });
    if (index === 8) assert.equal(await page.getByRole('button', exact('Halte de mi-parcours')).isDisabled(), true);
  }
  await page.locator('[data-celebration="checkpoint"]').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(Object.values((await state()).activities).filter(item => item.independent).length, 10);
  assert.equal(await page.getByRole('button', exact('Halte de mi-parcours')).isEnabled(), true);
  checks.push('Ten real practice submissions open the optional midpoint; nine do not. No progress injection.');
  await inspect(390, 'midpoint-available');
  await page.getByRole('button', exact('Halte de mi-parcours')).click();
  await page.getByRole('button', exact('Commencer la halte')).click();
  await completeAssessment(unit.midpoint);
  await page.locator('[data-celebration="recap"]').waitFor();
  const afterRecap = await state();
  assert.equal(afterRecap.assessments[unit.midpoint.id].bestIndependent, 100);
  assert.equal(afterRecap.assessments[unit.quiz.id], undefined);
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('dialog[open]').count(), 0);
  checks.push('A real five-question recap earns its own milestone; reload is silent and unit mastery is untouched.');

  await page.getByRole('button', exact('Bilan de l’unité')).click();
  await inspect(320, 'mission-intro');
  await page.getByRole('button', exact('Commencer le bilan')).click();
  await completeAssessment(unit.quiz, { wrongFirst: true, assisted: true, capture: 'mission-correction-320.png' });
  const assisted = (await state()).assessments[unit.quiz.id];
  assert.equal(assisted.bestIndependent, null);
  assert.equal(assisted.bestAssisted, 80);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.getByTestId('course-mission-result').innerText(), unit.quiz.mission.assisted.fr);
  checks.push('Wrong-answer recovery and selected-option feedback are visible; an assisted 80 percent run does not award mastery.');
  await page.getByRole('button', exact('Refaire le bilan')).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeAssessment(unit.quiz, { capture: 'mission-independent-1280.png' });
  await page.locator('[data-celebration="mastery"]').waitFor();
  await delay(2_700);
  const victory = page.locator('dialog[open]');
  assert.ok((await victory.innerText()).includes(nextUnit.title.fr), 'Victory reveals the real next unit');
  assert.ok((await victory.innerText()).includes(nextUnit.objectives[0].fr), 'Victory explains the next learning objective');
  for (const width of [1280, 390, 320]) await inspect(width, 'victory');
  const beforeReplay = await state();
  assert.equal(beforeReplay.assessments[unit.quiz.id].bestIndependent, 100);
  assert.equal(beforeReplay.assessments[unit.quiz.id].attempts, 2);
  // Enable sound with a real user gesture, then replay the existing native WebAudio cue.
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Merged mastery has no duplicate next-unlock dialog');
  await page.getByRole('checkbox', exact(copy.effects)).check();
  await page.locator('summary').filter({ hasText: copy.milestones }).click();
  await page.getByRole('button', exact(`${copy.replay} : ${unit.title.fr} · ${copy.kinds.mastery}`)).click();
  await page.waitForSelector('[data-effect-state="played"]');
  assert.deepEqual(await state(), beforeReplay, 'Replay does not rewrite learning records');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => Boolean(document.querySelector('dialog[open]')?.contains(document.activeElement))), true, 'Keyboard focus stays in the native dialog');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await victory.getByRole('button', exact(copy.replay)).click();
  const activeAnimations = await victory.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
  assert.equal(activeAnimations, 0, 'Reduced motion presents the finished scene without running animations');
  await inspect(390, 'victory-reduced-motion');
  await page.keyboard.press('Escape');
  assert.deepEqual(await state(), beforeReplay);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('dialog[open]').count(), 0);
  checks.push('Independent mission success opens one victory with the actual next destination; replay/skip preserve attempts and scores.');
  checks.push('Native sound cue plays after opt-in; keyboard focus is contained; reduced motion is static; 320/390/1280px layouts fit.');

  await page.locator('summary').filter({ hasText: copy.milestones }).click();
  await page.getByRole('button', exact(`${copy.replay} : ${unit.title.fr} · ${copy.kinds.mastery}`)).click();
  const destination = page.locator('dialog[open] a[href*="/u02"]');
  await destination.click();
  await page.getByRole('heading', { level: 1, name: nextUnit.title.fr, exact: true }).waitFor();
  assert.equal((await state()).assessments[unit.quiz.id].attempts, 2);
  checks.push('Victory destination link enters the real second unit with the stored result intact.');
  assert.deepEqual(errors, [], 'No uncaught page errors during the learning loop');
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, checks, errors, geometry, audio: 'Native HTMLAudio uses a WAV test fixture; native WebAudio victory cue is exercised directly.' }, null, 2));
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: false, checks, errors, geometry, failure: String(error) }, null, 2));
  throw error;
} finally {
  try { await browser?.close(); }
  finally {
    if (server.exitCode === null && server.signalCode === null) {
      await new Promise(resolve => {
        let forceTimer, closeTimer;
        const finish = () => { clearTimeout(forceTimer); clearTimeout(closeTimer); server.off('close', finish); resolve(); };
        server.once('close', finish); server.kill('SIGTERM');
        forceTimer = setTimeout(() => server.kill('SIGKILL'), 5_000); closeTimer = setTimeout(finish, 7_000);
      });
    }
    server.stdout.unpipe(log); server.stderr.unpipe(log);
    await new Promise(resolve => log.end(resolve));
  }
}
