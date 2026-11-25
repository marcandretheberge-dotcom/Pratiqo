import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { personalizedItalianCatalog: catalog, personalizedItalianUnits: units } = require('../../lib/yo/personalized/courseData.ts');
const { emptyCourseProgress, recordCourseAssessment } = require('../../lib/yo/italian/course/courseProgress.ts');

const base = process.env.REVIEW_URL || 'http://127.0.0.1:55812';
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/, 'Synthetic progress must never run on a hosted origin');
const { chromium } = createRequire(path.resolve(process.argv[2] || 'package.json'))('playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined });
const out = path.resolve('build/italian-travel-review/application');
await fs.mkdir(out, { recursive: true });
let progress = emptyCourseProgress();
for (const unit of units.slice(0, 7)) progress = recordCourseAssessment(progress, catalog, unit.quiz.id, unit.quiz.questions.length, unit.quiz.questions.length, false);
const reports = [];
try {
 for (const [width, height] of [[390,844], [1280,900]]) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  const page = await context.newPage(), errors = [], writes = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', async route => {
   if (!['GET','HEAD'].includes(route.request().method())) { writes.push(new URL(route.request().url()).pathname); await route.abort(); }
   else await route.continue();
  });
  await context.addInitScript(({ progress }) => {
   if (location.hostname !== '127.0.0.1' || sessionStorage.getItem('italian-release-seeded')) return;
   localStorage.setItem('yo.learning-profile.v1.it', JSON.stringify({version:1,language:'it',experience:'words',goal:'travel',weeklyMinutes:60,startUnitId:'u01',placement:'manual',reviewUnitIds:[],updatedAt:Date.now()}));
   localStorage.setItem('yo.italian.course.first-meeting.v2',JSON.stringify(progress));
   localStorage.setItem('yo.it.travel.cosmetics.v1',JSON.stringify({version:1,arrived:true,discovered:true,selected:'u06',positions:{'daily-life':1},equipped:false}));
   sessionStorage.setItem('italian-release-seeded','true');
  }, { progress });
  const response = await page.goto(base + '/yo/langues/italien/parcours/u06?lang=en');
  assert.equal(response.status(),200);
  await page.locator('[data-city=u06]').waitFor();
  const banner = page.getByTestId('cookie-consent-banner');
  await banner.waitFor();
  await banner.getByRole('button',{name:/Nécessaires seulement|Necessary only|Solo necesarias/i}).click();
  await banner.waitFor({state:'hidden'});
  await page.addLocatorHandler(page.getByRole('complementary',{name:/Install Pratiqo|Installer Pratiqo|Instalar Pratiqo/}), async prompt => {
   await prompt.getByRole('button',{name:/Not now|Pas maintenant|Ahora no/}).click();
  });
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(out,`application-initial-${width}.png`),fullPage:true});
  const initial = await page.evaluate(()=>({ledger:localStorage.getItem('yo.italian.course.first-meeting.v2'),url:location.href,scroll:scrollY}));
  await page.evaluate(()=>{window.releaseMap=document.querySelector('[data-geographic-map]');});
  await page.locator('[data-city=u08]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-city=u05]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-city=u08]').click();
  await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]')?.getAttribute('data-motion')==='idle');
  assert.equal(await page.evaluate(()=>window.releaseMap===document.querySelector('[data-geographic-map]')),true);
  assert.deepEqual(await page.evaluate(()=>({ledger:localStorage.getItem('yo.italian.course.first-meeting.v2'),url:location.href,scroll:scrollY})),initial);
  assert.equal(await page.locator('[data-travel-continue]').textContent(),'Continue in Venezia');
  await page.locator('[data-travel-continue]').click();
  await page.waitForURL('**/u08?lang=en&mission=continue');
  await page.locator('[data-yoppo-mission-window]').waitFor();
  await page.getByRole('button',{name:'Leave and save my place'}).click();
  await page.locator('[data-yoppo-mission-window]').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-city=u08]').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Journey and equipment'}).click();
  await page.getByRole('switch',{name:'Equip scooter'}).click();
  await page.getByRole('button',{name:'Close equipment'}).click();
  await page.reload();
  await page.getByRole('button',{name:'Leave and save my place'}).click();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-pose'),'riding');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-city=u06]').click();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'idle');
  await page.screenshot({path:path.join(out,`application-${width}.png`),fullPage:true});
  const dimensions=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
  assert.ok(dimensions.scrollWidth<=width+1,'No horizontal overflow');
  assert.ok(dimensions.scrollHeight<=height+1,'Single screen application map');
  assert.deepEqual(errors,[]);
  reports.push({width,height,dimensions,errors,blockedWrites:writes});
  await context.close();
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));
 console.log('PASS real application: mobile/desktop, geographic map, retarget, resume routes, mission return, scooter persistence and reduced motion');
} finally { await browser.close(); }
