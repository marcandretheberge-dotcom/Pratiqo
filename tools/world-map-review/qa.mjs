import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const { introCourses } = createRequire(import.meta.url)('../../lib/yo/shared/course.ts');
const { introAudioPaths } = createRequire(import.meta.url)('../../lib/yo/shared/audio.server.ts');
const require=createRequire(path.resolve(process.argv[2]||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})});
const out=path.resolve('build/world-map-review/evidence');await fs.mkdir(out,{recursive:true});
const base=process.env.REVIEW_URL||'http://127.0.0.1:55730',results=[];
assert(/^http:\/\/127\.0\.0\.1:\d+$|^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base),'Isolated review URL only');
const audioOnly=process.argv.includes('--audio-only');
const languages=['allemand','portugais-bresil','japonais','mandarin','francais-quebec','anglais','espagnol'];
const route=lang=>`${base}/yo/langues/${lang}/${['francais-quebec','anglais','espagnol'].includes(lang)?'demarrer':'parcours'}`;
const pos=n=>({left:n.style.left,top:n.style.top});
const ledger=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/course|progress|shared-intro/.test(k)).map(k=>{
 const p=JSON.parse(localStorage.getItem(k));return[k,Object.fromEntries(['assessments','activities','productions','completed','answers','best','results','trivia'].filter(x=>x in p).map(x=>[x,p[x]]))];
}));
try {
 for(const width of (audioOnly?[]:[390,1280])) for(const language of languages){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390,...(width===390&&language==='allemand'?{recordVideo:{dir:path.join(out,'video'),size:{width:390,height:844}}}:{})});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route(language)+'?scenario=progress&lang=en');await page.locator('[data-shared-world-map]').waitFor();
  // React mounts after the document load event; wait for its local font before measuring a tap.
  await page.evaluate(()=>document.fonts.ready);
  const map=page.locator('[data-shared-world-map]'),traveler=page.locator('[data-yoppo-traveler]');
  await map.locator('.yo-shared-atlas').scrollIntoViewIfNeeded();
  const before=await page.evaluate(ledger),guide=await map.getAttribute('data-canonical-guide');
  assert.equal(await traveler.getAttribute('data-destination-index'),'2',language+' progress fixture');
  await page.evaluate(()=>{
   const map=document.querySelector('[data-shared-world-map]'),art=map.querySelector('.yo-shared-scenery'),t=map.querySelector('[data-yoppo-traveler]');
   const q=window.mapQA={map,art,t,url:location.href,y:scrollY,frames:[],run:true};
   const sample=time=>{if(!q.run)return;const r=q.art.getBoundingClientRect();q.frames.push({time,left:t.style.left,top:t.style.top,same:q.map===document.querySelector('[data-shared-world-map]')&&q.art===document.querySelector('.yo-shared-scenery')&&q.t===document.querySelector('[data-yoppo-traveler]'),opacity:getComputedStyle(art).opacity,y:scrollY,url:location.href,artX:r.x,artY:r.y,leg:getComputedStyle(t.querySelector('.yo-map-leg-front')).transform});requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  const stops=map.locator('.yo-shared-destinations button');await stops.nth(0).click();
  await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='walking');
  await page.waitForTimeout(500);
  await stops.nth(1).evaluate(button=>button.addEventListener('click',()=>{
   const t=document.querySelector('[data-yoppo-traveler]');const sample=()=>({time:performance.now(),x:parseFloat(t.style.left)*4.8,y:parseFloat(t.style.top)*6,motion:t.dataset.motion});
   window.retarget=[sample()];const frame=()=>{window.retarget.push(sample());if(window.retarget.length<13)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  },{capture:true,once:true}));
  await stops.nth(1).click();await page.waitForFunction(()=>window.retarget?.length===13);
  const retarget=await page.evaluate(()=>window.retarget);
  await fs.writeFile(path.join(out,`${language}-${width}-retarget.json`),JSON.stringify(retarget,null,2));
  assert.equal(retarget[0].motion,'walking','retarget occurs before arrival, not after a slow screenshot');
  for(let i=1;i<retarget.length;i++)assert(Math.hypot(retarget[i].x-retarget[i-1].x,retarget[i].y-retarget[i-1].y)<=500*(retarget[i].time-retarget[i-1].time)/1000+1,`continuous retarget (${language}, ${width}, sample ${i})`);
  await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle');
  const frames=await page.evaluate(()=>{window.mapQA.run=false;return window.mapQA.frames;});
  await fs.writeFile(path.join(out,`${language}-${width}-frames.json`),JSON.stringify(frames,null,2));
  assert(frames.length>15);assert(new Set(frames.map(f=>f.left)).size>10);assert(new Set(frames.map(f=>f.leg)).size>5,'articulated feet');
  assert(frames.every(f=>f.same&&f.opacity==='1'&&f.url===frames[0].url&&f.y===frames[0].y&&f.artX===frames[0].artX&&f.artY===frames[0].artY),`no remount, flash, URL or scroll change (${language}, ${width})`);
  const roadError=await page.evaluate(frames=>{
   const path=document.querySelector('.yo-shared-road path'),length=path.getTotalLength();const points=Array.from({length:2001},(_,i)=>path.getPointAtLength(length*i/2000));
   return Math.max(...frames.map(f=>Math.min(...points.map(p=>Math.hypot(p.x-parseFloat(f.left)*4.8,p.y-parseFloat(f.top)*6)))));
  },frames);assert(roadError<1,'feet follow actual visible road');
  assert.equal(await map.getAttribute('data-canonical-guide'),guide);assert.deepEqual(await page.evaluate(ledger),before);
  const arrival=await traveler.evaluate(pos);await stops.nth(1).click();assert.deepEqual(await traveler.evaluate(pos),arrival);assert.equal(await traveler.getAttribute('data-motion'),'idle');
  assert.equal(await map.locator('.yo-shared-continue').count(),1);await page.screenshot({path:path.join(out,`${language}-${width}-arrival.png`)});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await map.locator('.yo-shared-continue').click();await map.waitFor({state:'detached'});
  assert(!await page.getByRole('heading',{name:'One step at a time',exact:true}).count(),'accessible mission opens');
  if(['francais-quebec','anglais','espagnol'].includes(language))await page.getByRole('button',{name:'Leave and save my place'}).click();else await page.getByRole('link',{name:'Carte',exact:true}).click();
  await map.waitFor();assert.deepEqual(await traveler.evaluate(pos),arrival,'return preserves visual position');
  assert.deepEqual(await page.evaluate(ledger),before,'mission visit never awards learning');assert.deepEqual(errors,[]);
  results.push({language,width,frames:frames.length,roadError,checks:'walk/retarget/idle/road/no flash/URL/scroll/progress/Continue/return/overflow',errors});console.log('PASS '+language+' '+width);await context.close();
  if(width===390&&language==='allemand')await fs.copyFile(await page.video().path(),path.join(out,'walk-mobile.webm'));
 }
 for(const language of (audioOnly?[]:languages)){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto(route(language)+'?lang=es');await page.locator('[data-shared-world-map]').waitFor();
  assert(await page.locator('.yo-shared-destinations button').nth(1).isDisabled());
  await page.getByLabel('Scénario de démonstration').selectOption('progress');await page.locator('[data-shared-world-map]').waitFor();await page.locator('.yo-shared-destinations button').nth(0).click();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'idle');
  assert.equal(await page.locator('.yo-map-leg-front').evaluate(n=>getComputedStyle(n).animationName),'none');assert.equal(await page.locator('.yo-shared-continue').innerText(),'Continuar');
  results.push({language,checks:'beginner locked / reduced motion / Spanish interface'});await context.close();
 }
 for(const language of languages){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
  const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.reviewAudio=[];window.Audio=class extends NativeAudio{constructor(...args){super(...args);window.reviewAudio.push(this);}};});
  await page.goto(`${base}/yo/langues/${language}/demarrer?lang=en&scenario=progress`);
  await page.locator('[data-shared-world-map]').waitFor();
  await page.getByRole('button',{name:'Word notebook',exact:true}).click();
  const course=introCourses.find(c=>c.slug===language),recordings=introAudioPaths(course);
  const recordedIndex=course.phrases.findIndex(p=>recordings[p.text]);
  assert(recordedIndex>=0,'at least one recorded phrase, not a simulated device voice');
  await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Listen to the message'}).nth(recordedIndex).click();
  await page.waitForFunction(()=>window.reviewAudio.some(a=>a.currentTime>.02||a.played.length>0),{},{timeout:20000});
  const audio=await page.evaluate(()=>window.reviewAudio.filter(a=>a.played.length).map(a=>({src:a.src,duration:a.duration,played:a.played.end(0)})));
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  assert(await page.evaluate(()=>window.reviewAudio.every(a=>a.paused)),'closing notebook stops real audio');
  await page.getByRole('button',{name:'My tools',exact:true}).click();await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('.yo-shared-destinations button').nth(0).click();
  await page.locator('.yo-shared-continue').click();await page.getByRole('button',{name:'Leave and save my place'}).waitFor();
  await page.getByRole('button',{name:'Leave and save my place'}).click();await page.locator('[data-shared-world-map]').waitFor();
  if(language==='espagnol'){
   await page.getByRole('button',{name:'Next stops',exact:true}).click();
   await page.locator('.yo-shared-destinations button').nth(2).click();await page.locator('.yo-shared-continue').click();
   await page.getByRole('heading',{name:'One word, different contexts'}).waitFor();
   assert(await page.getByRole('link',{name:'Explore the existing Dominican course'}).count());
   await page.getByRole('button',{name:'autobús',exact:true}).click();
   await page.getByRole('button',{name:'Back to the map',exact:true}).click();
   await page.locator('.yo-shared-continue').click();assert(await page.getByText('Yes, in this situation.',{exact:true}).isVisible());
  }
  await page.goto(`${base}/yo/langues/${language}/demarrer/vocabulaire?lang=en`);
  await page.locator('[data-shared-print]').waitFor();
  assert(await page.getByRole('link',{name:'Back to my journey'}).count());
  assert.deepEqual(writes,[]);results.push({language,checks:'actual intro / notebook / native MP3 playback / stop / tools / leave / printables / Spanish regional answer retention',audio,recordedPhrases:course.phrases.filter(p=>recordings[p.text]).length,totalPhrases:course.phrases.length});
  console.log('PASS intro/audio '+language);await context.close();
 }
 await fs.writeFile(path.join(out,audioOnly?'audio-verified.json':'verified.json'),JSON.stringify({browser:browser.version(),results},null,2));console.log(`${results.length} browser cases passed`);
 await fs.writeFile(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartes · Preuves visuelles</title><h1>Captures de la preview locale</h1><style>body{font:16px system-ui;margin:24px}main{display:flex;gap:24px;flex-wrap:wrap}img{width:300px;max-width:100%;border:1px solid #ddd}figure{margin:0}figcaption{padding:10px}</style><main>'+languages.map(l=>`<figure><a href="${l}-390-arrival.png"><img src="${l}-390-arrival.png" alt="Carte ${l} sur mobile"></a><figcaption>${l}</figcaption></figure>`).join('')+'</main>');
}finally{await browser.close();}
