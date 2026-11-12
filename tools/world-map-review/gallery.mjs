import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require=createRequire(path.resolve(process.argv[2]||'package.json'));
const {chromium}=require('playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:55730';
assert(/^http:\/\/127\.0\.0\.1:\d+$|^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base),'Isolated review URL only');
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})});
const languages=['italien','allemand','portugais-bresil','japonais','mandarin','francais-quebec','anglais','espagnol'];
const route=l=>`/yo/langues/${l}/${['francais-quebec','anglais','espagnol'].includes(l)?'demarrer':'parcours'}`;
const out=path.resolve('build/world-map-review/evidence');
await fs.mkdir(out,{recursive:true});
const results=[];
try {
 for(const language of languages) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  for(const scenario of ['beginner','progress','locked']) {
   await page.goto(base+route(language)+`?lang=fr&scenario=${scenario}`);
   const map=page.locator(language==='italien'?'[data-yoppo-world-map]':'[data-shared-world-map]');
   const go=map.locator(language==='italien'?'.yo-map-continue':'.yo-shared-continue');
   await map.waitFor();await go.waitFor();
   assert.equal(await go.count(),1,'single Continue');
   await page.locator('[data-yoppo-traveler]').waitFor();
   assert.equal(await page.getByLabel('Scénario de démonstration').inputValue(),scenario);
   if(scenario!=='progress') assert(await map.locator(language==='italien'?'[data-status="locked"]':'.yo-shared-destinations button:disabled').count()>0,'real locked destination');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
   if(scenario==='progress') {
    await page.evaluate(()=>document.fonts.ready);
    // Capture the whole mobile-width panel, clear of the course's sticky footer.
    const panel=await map.boundingBox();
    await page.setViewportSize({width:390,height:Math.ceil(panel.height+400)});
    await map.screenshot({path:path.join(out,`${language}-mobile-complete.png`),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
   }
   results.push({language,scenario,continue:await go.innerText(),errors:[...errors]});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('PASS mobile gallery + 3 scenarios: '+language);
  await context.close();
 }
 await fs.writeFile(path.join(out,'gallery-verified.json'),JSON.stringify({base,browser:browser.version(),results},null,2));
 const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Huit cartes Yoppo · Revue mobile</title><style>body{font:16px system-ui;margin:24px;color:#193d36;background:#f5f8f7}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}img{width:100%;max-width:390px;border:1px solid #bdcdc6}figure{margin:0}figcaption{padding:12px 0}video{max-width:100%;width:390px}a{color:#175e52}</style><h1>Huit cartes Yoppo</h1><p>Captures de composants réels à 390 px, données synthétiques. Émulation mobile, pas un essai Safari physique.</p><p><a href="/">Ouvrir la preview interactive</a></p><main>'+languages.map(l=>`<figure><a href="${l}-mobile-complete.png"><img src="${l}-mobile-complete.png" alt="${l} : décor, Yoppo, destinations et Continuer" loading="lazy"></a><figcaption><strong>${l}</strong> · <a href="${route(l)}?lang=fr&scenario=progress">Essayer</a></figcaption></figure>`).join('')+'</main><h2>Marche, changement de destination et reprise</h2><video controls playsinline preload="metadata" src="walk-mobile.webm"></video><p><a href="walk-mobile.webm">Télécharger la vidéo WebM</a>. Si Safari ne la lit pas, utiliser les cartes interactives ci-dessus.</p></html>';
 await fs.writeFile(path.join(out,'index.html'),html);
 console.log('PASS 24 review states, eight full mobile captures');
} finally {await browser.close();}
