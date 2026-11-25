import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const { personalizedItalianUnits: units, personalizedItalianCatalog: catalog } = require('../../lib/yo/personalized/courseData.ts');
const { emptyCourseProgress, recordCourseAssessment, serializeCourseProgress } = require('../../lib/yo/italian/course/courseProgress.ts');
const { PREVIEW_PROGRESS_KEY } = require('../../lib/yo/rewards/italianPreviewRewards.ts');
const { approvedRoad, roadPath } = require('../../components/yo/journey/map/roadGeometry.ts');
let progress = emptyCourseProgress();
for (const {quiz} of units.slice(0,2)) progress = recordCourseAssessment(progress,catalog,quiz.id,quiz.questions.length,quiz.questions.length,false);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.addInitScript(([key, data]) => {
    localStorage.setItem(key,data);
    localStorage.setItem('yo.preview.italian-rewards.v1.travel',JSON.stringify({version:1,arrived:true,selected:'u01'}));
  }, [PREVIEW_PROGRESS_KEY,serializeCourseProgress(progress)]);
  await page.goto('http://127.0.0.1:55851/?lang=fr');
  const atlas = page.locator('[data-illustrated-map=discover]'), traveler = atlas.locator('[data-yoppo-traveler]');
  await traveler.waitFor();
  await page.getByRole('button',{name:/Carte 1\/3.*12 villes/}).click();
  const overview=page.getByRole('dialog');
  assert.equal(await overview.locator('li').count(),3);
  for(const city of ['Bologna','Venezia','Palermo']) assert.ok((await overview.innerText()).includes(city));
  assert.equal(await overview.locator('li button:disabled').count(),2);
  await overview.getByRole('button',{name:'Fermer'}).click();
  assert.equal(await atlas.locator('[data-travel-road]').getAttribute('d'),roadPath(approvedRoad));
  await atlas.evaluate(async node => {
    const image = new Image(); image.src = getComputedStyle(node).backgroundImage.slice(5,-2);
    await image.decode();
    if (!image.src.endsWith('/worlds/discover.webp') || image.naturalWidth < 480) throw Error('Expected original atlas artwork');
    window.reviewAtlasNode = node;
  });
  const before = await page.evaluate(k=>localStorage.getItem(k),PREVIEW_PROGRESS_KEY);
  await atlas.locator('[data-city=u03]').tap();
  await page.waitForFunction(()=>Number.parseFloat(document.querySelector('[data-yoppo-traveler]').style.left)>33);
  await atlas.locator('[data-city=u02]').tap();
  await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle' && document.querySelector('[data-yoppo-traveler]').dataset.destinationIndex==='1');
  assert.equal(await atlas.evaluate(node=>node===window.reviewAtlasNode),true);
  assert.equal(await page.locator('[data-travel-continue]').innerText(),'Continuer à Parma');
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),PREVIEW_PROGRESS_KEY),before);
  assert.equal(await atlas.locator('[data-city=u04]').getAttribute('aria-disabled'),'true');
  console.log('PASS: original artwork decoded, original road, accessible city tap, mid-walk change, stable map and learning progress, locked stop.');
} finally { await browser.close(); }
