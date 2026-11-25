import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:55851';
const out = '.qa-guided/italian-rewards';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [], audio = [], playback = [];
const context = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, recordVideo:{dir:out+'/video',size:{width:390,height:844}} });
await context.addInitScript(() => {
  const sentinel = 'real-learning-must-remain-untouched';
  localStorage.setItem('yopratiqo:italian-course:a1:v1', sentinel);
  const play = HTMLMediaElement.prototype.play;
  const start = AudioBufferSourceNode.prototype.start;
  window.reviewEffects = [];
  AudioBufferSourceNode.prototype.start = function (...args) {
    const result = start.apply(this,args);
    if (this.buffer) window.reviewEffects.push({duration:this.buffer.duration, state:this.context.state});
    return result;
  };
  window.reviewAudio = [];
  HTMLMediaElement.prototype.play = function (...args) {
    const record = { src: this.src, ended:false, time:0, events:[] };
    window.reviewAudio.push(record);
    for(const event of ['playing','pause','ended','error','waiting','loadedmetadata']) this.addEventListener(event,()=>{
      record.events.push({event,time:this.currentTime,duration:this.duration,ready:this.readyState,error:this.error?.message});
    },true);
    // Capture before the player's cleanup resets currentTime to zero.
    this.addEventListener('timeupdate', () => { record.time = Math.max(record.time, this.currentTime); });
    this.addEventListener('ended', () => { record.ended = true; record.time = Math.max(record.time, this.currentTime); }, {once:true,capture:true});
    return play.apply(this, args);
  };
});
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.url().includes('/review-audio/') || r.url().endsWith('.mp3')) audio.push({url:r.url(),status:r.status()}); });
try {
  await page.goto(base+'/?lang=fr');
  await page.getByRole('button',{name:'Passer',exact:true}).click();
  await page.locator('[data-yoppo-traveler]').waitFor();
  assert.equal(await page.locator('[data-city="u02"]').getAttribute('aria-disabled'), 'true');
  // Dispatch a real pointer tap even though Playwright honors aria-disabled:
  // the component's handler must also refuse the locked destination.
  await page.locator('[data-city="u02"]').click({force:true});
  assert.equal(await page.locator('[data-city="u01"]').getAttribute('aria-pressed'), 'true');
  await page.screenshot({path:out+'/mobile-journey.png',fullPage:true});
  results.push('Fresh map loads; locked Parma cannot be selected');
  await page.getByRole('button',{name:'Continuer à Bologna',exact:true}).click();
  await page.getByRole('button',{name:'Commencer ma mission',exact:true}).click();
  await page.getByRole('button',{name:'Écouter : Ciao!',exact:true}).click();
  // The production player cleans up on pause, which precedes ended in Chromium.
  // Verify the measured media clock actually reached its decoded duration.
  await page.waitForFunction(() => window.reviewAudio.some(a =>
    a.events.some(e => e.event === 'playing') &&
    a.events.some(e => e.event === 'pause' && e.duration > 0 && e.time >= e.duration - .04)
  ), undefined, {timeout:20000});
  assert(audio.some(a => a.status === 200), 'recorded speech actually loaded successfully');
  playback.push(...await page.evaluate(() => window.reviewAudio));
  results.push('Voluntary real recording loaded and played to completion');
  for (let i=0;i<7;i++) await page.getByRole('button',{name:'Expression suivante',exact:true}).click();
  // Vocabulary, scene, grammar and pronunciation stay in the real lesson.
  for (let i=0;i<4;i++) await page.getByRole('button',{name:'Continuer',exact:true}).click();
  await page.getByRole('button',{name:'Ciao!',exact:true}).click();
  await page.getByRole('button',{name:'Bonjour !',exact:true}).click();
  assert.equal(await page.locator('[data-total-xp]').textContent(), '0');
  for (const [it,fr] of [['Ciao!','Salut !'],['Buongiorno!','Bonjour !'],['Mi chiamo Nina.','Je m’appelle Nina.'],['Come ti chiami?','Comment t’appelles-tu ?']]) {
    await page.getByRole('button',{name:it,exact:true}).click();
    await page.getByRole('button',{name:fr,exact:true}).click();
  }
  await page.locator('.reward-toast').waitFor();
  assert.match(await page.locator('.reward-toast').textContent(), /5/);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.reward-toast')).opacity === '1');
  await page.screenshot({path:out+'/mobile-earned-xp.png'});
  await page.waitForFunction(() => document.querySelector('[data-total-xp]').textContent === '5');
  results.push('Wrong answer earns zero; canonical corrected/assisted completion earns 5 XP and Yoppo reaction');
  await page.getByRole('button',{name:'Quitter et garder ma place',exact:true}).click();
  const progressBefore = await page.evaluate(() => localStorage.getItem('yo.preview.italian-rewards.v1.progress'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-total-xp]')?.textContent === '5');
  assert.equal(await page.locator('.reward-toast').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('yo.preview.italian-rewards.v1.progress')), progressBefore);
  assert.equal(await page.evaluate(() => localStorage.getItem('yopratiqo:italian-course:a1:v1')), 'real-learning-must-remain-untouched');
  results.push('Reload retains exact canonical progress and 5 XP, with no repeated celebration; real progress untouched');
  await page.getByRole('button',{name:'Objectifs',exact:true}).click();
  assert.equal(await page.getByRole('progressbar',{name:'Réussir 5 activités'}).first().getAttribute('value'), '1');
  await page.screenshot({path:out+'/mobile-goals.png',fullPage:true});
  await page.getByRole('button',{name:'Classement',exact:true}).last().click();
  assert.match(await page.locator('.reward-demo-notice').innerText(), /fictifs/);
  assert.match(await page.locator('.is-you').innerText(), /5/);
  await page.screenshot({path:out+'/mobile-ranking.png',fullPage:true});
  results.push('Daily goal updates to 1/5; weekly demo row shows earned XP and labels fictional competitors');
  await page.getByRole('button',{name:'Parler',exact:true}).click();
  const card = page.locator('.reward-postcard');
  assert.equal(await card.locator('h2').textContent(), 'Ciao!');
  await card.getByRole('button',{name:'Autre phrase'}).click();
  assert.notEqual(await card.locator('h2').textContent(), 'Ciao!');
  assert.equal(await page.locator('.reward-meet a').first().getAttribute('href'), 'https://www.pratiqo.ca/cafe');
  assert.equal(await page.locator('.reward-meet a').last().getAttribute('href'), 'https://www.pratiqo.ca/trouver-un-prof?q=italien');
  assert.equal(await page.locator('[data-total-xp]').textContent(), '5');
  await page.screenshot({path:out+'/mobile-conversation.png',fullPage:true});
  results.push('Conversation cards use real phrases; free exchange and private teacher links are separate, no XP or booking for browsing');
  await page.getByRole('button',{name:'Réglages',exact:true}).click();
  const cuesBefore = await page.evaluate(() => window.reviewEffects.length);
  await page.getByRole('button',{name:'Écouter l’accord de réussite',exact:true}).click();
  await page.waitForFunction(before => window.reviewEffects.slice(before).some(c => c.state === 'running' && Math.abs(c.duration - .312) < .001), cuesBefore);
  await page.getByRole('switch',{name:'Sons de réussite',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Écouter l’accord de réussite',exact:true}).isDisabled(),true);
  results.push('Original correct-answer motif starts in a running browser audio context and explicit mute disables audition');
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Réglages',exact:true}).click();
  assert.equal(await page.getByRole('switch',{name:'Sons de réussite',exact:true}).getAttribute('aria-checked'),'false');
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  await page.getByRole('button',{name:'Continuer à Bologna',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Commencer ma mission',exact:true}).count(),0);
  await page.getByRole('button',{name:'Quitter et garder ma place',exact:true}).click();
  results.push('Mute preference persists; Continue resumes without replaying the mission introduction');
  for (const width of [320,390,768,1366]) {
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal page overflow at '+width);
    assert(await page.locator('.travel-map').evaluate(e => e.getBoundingClientRect().height >= 290), 'visible map at '+width);
    const cta = await page.locator('[data-travel-continue]').boundingBox(), nav = await page.locator('.reward-tabs').boundingBox();
    assert(cta.y + cta.height <= nav.y, 'Continue stays above navigation at '+width);
  }
  await page.screenshot({path:out+'/desktop-journey.png',fullPage:true});
  results.push('320/390/768/1366px layouts: visible map, no horizontal overflow');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Classement',exact:true}).last().click();
  await page.screenshot({path:out+'/desktop-ranking.png',fullPage:true});
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  results.push('Reduced-motion mode remains navigable');
  assert.deepEqual(errors, []);
  assert.equal(audio.filter(a=>a.status>=400).length,0);
  const blocked = await context.request.post(base+'/api/booking', {data:{}});
  assert.equal(blocked.status(),405);
  results.push('No runtime page errors or failed observed recordings; write endpoints return 405');
} finally {
  await context.close(); await browser.close();
  await fs.writeFile(out+'/browser-results.json', JSON.stringify({results,errors,audio,playback},null,2));
}
console.log(JSON.stringify({passed:results.length,results},null,2));
