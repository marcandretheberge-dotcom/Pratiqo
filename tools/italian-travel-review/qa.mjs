import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const {chromium}=createRequire(path.resolve(process.argv[2]||'package.json'))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
const base=process.env.REVIEW_URL||'http://127.0.0.1:55810';
assert(/^http:\/\/127\.0\.0\.1:\d+$|^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base));
const out=path.resolve('build/italian-travel-review/evidence');await fs.mkdir(out,{recursive:true});
const results=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390,...(width===390?{recordVideo:{dir:path.join(out,'video'),size:{width:390,height:844}}}:{})});
  const page=await context.newPage(), errors=[],writes=[];
  await page.addInitScript(()=>{
    window.heard=[];
    const nativePlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){
      this.addEventListener('playing',()=>window.heard.push({src:this.currentSrc,duration:this.duration}),{once:true});
      return nativePlay.call(this);
    };
  });
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  await page.goto(base+'/?scenario=florence');
  await page.getByRole('button',{name:'Passer',exact:true}).click();
  await page.locator('[data-city=u06]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('[data-geographic-map]').evaluate(map=>{
    const bounds=map.getBoundingClientRect();
    return [...map.querySelectorAll('[data-city]')].every(city=>{const box=city.getBoundingClientRect();return box.left>=bounds.left&&box.right<=bounds.right&&box.top>=bounds.top&&box.bottom<=bounds.bottom;});
  }),true,'Every city label remains within the map');
  await page.screenshot({path:path.join(out,'mobile-initial-'+width+'.png'),fullPage:true});
  if(process.argv.includes('--inspect')){await context.close();continue;}
  const initialURL=page.url();
  const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yo.review.travel.course.v1')));
  const initialLedger=await ledger();
  await page.locator('[data-geographic-map]').scrollIntoViewIfNeeded();
  await page.evaluate(()=>{
    window.mapBefore=document.querySelector('[data-geographic-map]');window.travelerBefore=document.querySelector('[data-yoppo-traveler]');
    window.travelFrames=[]; window.trackTravel=true;
    const road=document.querySelector('[data-travel-road]'), length=road.getTotalLength();
    const line=Array.from({length:1600},(_,i)=>road.getPointAtLength(length*i/1599));
    function frame(time){
      const traveler=document.querySelector('[data-yoppo-traveler]'), x=parseFloat(traveler.style.left)*4.8,y=parseFloat(traveler.style.top)*6;
      window.travelFrames.push({same:traveler===window.travelerBefore&&document.querySelector('[data-geographic-map]')===window.mapBefore,
        visible:getComputedStyle(traveler).opacity==='1'&&getComputedStyle(window.mapBefore).visibility==='visible',
        distance:Math.min(...line.map(p=>Math.hypot(p.x-x,p.y-y))),scroll:scrollY,x,y,time});
      if(window.trackTravel)requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
  });
  await page.locator('[data-city=u05]').click();
  await page.waitForTimeout(450);
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'walking');
  await page.locator('[data-city=u06]').evaluate(city=>city.addEventListener('click',()=>{
    const traveler=document.querySelector('[data-yoppo-traveler]'), before=traveler.getAttribute('style');
    queueMicrotask(()=>window.retargetStable=before===traveler.getAttribute('style'));
  },{capture:true,once:true}));
  await page.locator('[data-city=u06]').click();
  assert.equal(await page.evaluate(()=>window.retargetStable),true,'Retarget leaves the displayed point intact at click');
  await page.waitForTimeout(2400);
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'idle');
  assert.equal(await page.evaluate(()=>window.mapBefore===document.querySelector('[data-geographic-map]')&&window.travelerBefore===document.querySelector('[data-yoppo-traveler]')),true);
  const frames=await page.evaluate(()=>{window.trackTravel=false;return window.travelFrames;});
  await fs.writeFile(path.join(out,'walk-frames-'+width+'.json'),JSON.stringify(frames));
  assert.ok(frames.length>10);assert.ok(frames.every(f=>f.same&&f.visible&&f.distance<1),'Continuous visible road walk, no remount or flash');
  // Motion writes styles in its own render phase. Our rAF observer can see the
  // preceding frame; include that interval instead of treating a delayed write as teleportation.
  assert.ok(frames.slice(1).every((f,i)=>Math.hypot(f.x-frames[i].x,f.y-frames[i].y)<=220*(f.time-frames[Math.max(0,i-1)].time)/1000+2),'No sampled movement exceeds the road speed over its render window');
  assert.ok(Math.max(...frames.map(f=>f.scroll))-Math.min(...frames.map(f=>f.scroll))<1,'Map tap does not scroll');
  assert.equal(page.url(),initialURL);assert.deepEqual(await ledger(),initialLedger);
  await page.locator('[data-city=u07]').click({force:true});
  assert.equal(await page.locator('[data-city=u06]').getAttribute('aria-pressed'),'true','Locked Siena cannot be selected');
  const pos=await page.locator('[data-yoppo-traveler]').getAttribute('style');
  await page.locator('[data-travel-continue]').click();
  assert.equal(await page.evaluate(()=>window.heard.length),0,'No automatic spoken audio');
  await page.getByRole('button',{name:'Écouter : Gira a destra.',exact:true}).click();
  await page.waitForFunction(()=>window.heard.some(a=>a.duration>0&&a.src.includes('.mp3')),{},{timeout:20000});
  await page.getByRole('button',{name:'Un petit détour culturel',exact:true}).click();
  await page.getByRole('button',{name:'Tevere',exact:true}).click();
  await page.getByRole('button',{name:'Arno',exact:true}).click();
  assert.deepEqual(await ledger(),initialLedger,'Culture never grants learning evidence');
  await page.getByRole('button',{name:'Continuer le module complet',exact:true}).click();
  await page.locator('[data-yoppo-mission-window]').waitFor();
  await page.screenshot({path:path.join(out,'mission-'+width+'.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.locator('[data-yoppo-mission-window]').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('style'),pos);
  await page.reload();await page.locator('[data-geographic-map]').waitFor();
  assert.equal(await page.getByRole('button',{name:'Passer',exact:true}).count(),0,'Arrival stays completed');
  await page.getByLabel('Scénario de démonstration').selectOption('checkpoint');
  await page.getByRole('button',{name:'Passer',exact:true}).click();
  await page.getByRole('switch',{name:'Équiper le scooter'}).click();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-pose'),'riding');
  await page.locator('[data-city=u05]').click();await page.waitForTimeout(2400);
  await page.locator('[data-city=u06]').click();await page.waitForTimeout(2400);
  assert.equal(await page.locator('[data-city=u06]').evaluate(city=>{
    const label=city.querySelector('span').getBoundingClientRect(), scooter=document.querySelector('.yo-travel-scooter').getBoundingClientRect();
    return label.right>scooter.left&&label.left<scooter.right&&label.bottom>scooter.top&&label.top<scooter.bottom;
  }),false,'Scooter must not cover the selected city label');
  await page.screenshot({path:path.join(out,'scooter-'+width+'.png'),fullPage:true});
  await page.reload();await page.locator('[data-geographic-map]').waitFor();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-pose'),'riding');
  await page.getByRole('switch',{name:'Descendre du scooter'}).click();
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-pose'),'walking');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-city=u05]').click();await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'idle');
  await page.getByLabel('Scénario de démonstration').selectOption('beginner');
  await page.getByRole('button',{name:'Embarquer',exact:true}).click();
  await page.getByRole('button',{name:'Passer',exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-city=u01]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-city=u02]').getAttribute('aria-disabled'),'true');
  assert.equal(await page.getByRole('switch',{name:'Équiper le scooter'}).count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Revoir l’arrivée'}).click();
  await page.getByRole('button',{name:'Embarquer',exact:true}).click();
  await page.locator('[data-flying=true]').waitFor();
  const flightStart=Date.now();
  await page.getByRole('button',{name:'Passer',exact:true}).waitFor({state:'hidden'});
  assert.ok(Date.now()-flightStart>=2500,'Normal flight visibly runs before arrival');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal overflow');
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  results.push({width,passed:true,frames:frames.length,maxRoadError:Math.max(...frames.map(f=>f.distance)),checks:['skip','smooth-retarget','stable-map-url-scroll','locked','culture-no-mastery','real-MP3-on-request','real-mission','resume-position','flight-not-replayed','normal-flight','scooter-equip-remove-persist','live-reduced-motion','beginner','no-network-writes']});
  const video=page.video();await context.close();
  if(video)await video.saveAs(path.join(out,'mobile-journey.webm'));
 }
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
 await fs.writeFile(path.join(out,'index.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voyage italien · Revue</title><style>body{font:16px system-ui;margin:24px;color:#234d40}main{display:flex;flex-wrap:wrap;gap:24px}img{max-width:100%;width:360px}video{max-width:100%;width:390px}figure{margin:0}a{color:inherit}</style><h1>Voyage italien : preuves visuelles</h1><p>Émulation Chromium. Aucun test sur iPhone physique ni synchronisation entre appareils.</p><p><a href="/">Ouvrir la preview</a> · <a href="results.json">Résultats</a></p><video controls playsinline preload="metadata" src="mobile-journey.webm"></video><main>'+['mobile-initial-390','scooter-390','mission-390','mobile-initial-1280'].map(name=>'<figure><a href="'+name+'.png"><img src="'+name+'.png" alt="'+name+'"></a><figcaption>'+name+'</figcaption></figure>').join('')+'</main></html>');
 console.log(JSON.stringify(results));
}finally{await browser.close();}
