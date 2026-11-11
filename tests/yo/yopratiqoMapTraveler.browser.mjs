import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
// Run against the backend-free review bundle, never a production origin.
const load=createRequire(import.meta.url);
const {chromium}=load(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const {personalizedItalianUnits,personalizedItalianCatalog}=load('../../lib/yo/personalized/courseData.ts');
const {emptyCourseProgress,recordCourseAssessment,serializeCourseProgress}=load('../../lib/yo/italian/course/courseProgress.ts');
const {TOUR_KEY}=load('../../lib/yo/italian/course/guidedItalian.ts');
const base=(process.env.MAP_REVIEW_URL ?? 'http://127.0.0.1:55742').replace(/\/$/,'');
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Synthetic progress is local-only');
const progressKey='yo.italian.course.first-meeting.v2';
async function main(){
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:true});
 try {
 await fs.mkdir('.qa-guided/map',{recursive:true});
 let earned=emptyCourseProgress();
 for(const unit of personalizedItalianUnits.slice(0,5))earned=recordCourseAssessment(earned,personalizedItalianCatalog,unit.quiz.id,unit.quiz.questions.length,unit.quiz.questions.length,false,1730000000000);
 const fixture={[progressKey]:serializeCourseProgress(earned),[TOUR_KEY]:'seen','yopratiqo.audio.muted':'true'};
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'.qa-guided/map/after-video',size:{width:390,height:844}}});
 await context.addInitScript(data=>{if(!localStorage.getItem('qa-map-seeded')){for(const [k,v]of Object.entries(data))localStorage.setItem(k,v);localStorage.setItem('qa-map-seeded','1');}},fixture);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?unit=u06&start=u12&lang=en');
 const traveler=page.locator('[data-yoppo-traveler]');await traveler.waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));
 assert.equal(await traveler.getAttribute('data-destination-index'),'1');
 const progress=await page.evaluate(k=>localStorage.getItem(k),progressKey);
 await page.evaluate(()=>{
  window.mapQA={map:document.querySelector('[data-yoppo-world-map]'),art:document.querySelector('.yo-world-art'),traveler:document.querySelector('[data-yoppo-traveler]'),url:location.href,y:scrollY,frames:[],running:true};
  const q=window.mapQA; const sample=t=>{if(!q.running)return;const a=q.art.getBoundingClientRect(),v=q.traveler.getBoundingClientRect();q.frames.push({t,x:v.x,y:v.y,feetX:v.x+v.width/2,feetY:v.y+v.height,map:q.map===document.querySelector('[data-yoppo-world-map]'),art:q.art===document.querySelector('.yo-world-art'),loaded:q.art.complete&&q.art.naturalWidth>0,opacity:getComputedStyle(q.art).opacity,scroll:scrollY,url:location.href,left:q.traveler.style.left,top:q.traveler.style.top,roadProgress:document.querySelector('[data-yoppo-path-progress]').dataset.yoppoPathProgress,leg:getComputedStyle(document.querySelector('.yo-map-leg-front')).transform,artX:a.x,artY:a.y});requestAnimationFrame(sample);};requestAnimationFrame(sample);
 });
 await page.getByRole('button',{name:/Explore Venezia/}).tap();
 assert.equal(await page.locator('[data-yoppo-map-token=u08]').getAttribute('data-selected'),'true');
 assert.match(await page.locator('.yo-map-continue').getAttribute('href'),/u08.*mission=continue/);
 await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='walking');
 await page.waitForTimeout(1100);await page.screenshot({path:'.qa-guided/map/walking.png'});
 await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle');
 await page.waitForTimeout(200);await page.screenshot({path:'.qa-guided/map/arrival.png'});
 const first=await page.evaluate(()=>{window.mapQA.running=false;return window.mapQA.frames;});
 assert(first.length>30);assert(new Set(first.map(f=>f.left)).size>20,'traveler visibly moves');
 assert(new Set(first.map(f=>f.leg)).size>5,'feet articulate, not a sliding avatar');
 assert(first.every(f=>f.map&&f.art&&f.loaded&&f.opacity==='1'&&f.scroll===first[0].scroll&&f.url===first[0].url&&f.artX===first[0].artX&&f.artY===first[0].artY),'no remount, flash, scroll or URL changes');
 assert(new Set(first.map(f=>f.roadProgress)).size===1);
 const roadError=await page.evaluate(frames=>{
   const road=document.querySelector('[data-yoppo-path-progress] path'),length=road.getTotalLength();
   const points=Array.from({length:2001},(_,i)=>road.getPointAtLength(length*i/2000));
   return Math.max(...frames.map(f=>Math.min(...points.map(p=>Math.hypot(p.x-parseFloat(f.left)*4.8,p.y-parseFloat(f.top)*6)))));
 },first);
 assert(roadError<1,'traveler uses the drawn SVG road, within one native pixel');
 assert.equal(await page.locator('[data-yoppo-active-city=true]').getAttribute('data-yoppo-map-token'),'u06');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),progressKey),progress);
 // Retrace the road, then retarget from a measured in-flight point.
 await page.getByRole('button',{name:/Explore Firenze/}).tap();
 await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle');
 await page.getByRole('button',{name:/Explore Venezia/}).tap();await page.waitForTimeout(900);
  await page.evaluate(()=>{
    const node=document.querySelector('[data-yoppo-traveler]');
    const sample=()=>({t:performance.now(),x:parseFloat(node.style.left)*4.8,y:parseFloat(node.style.top)*6});
    document.querySelector('[data-yoppo-map-token=u05]').closest('button').addEventListener('click',()=>{
      window.retargetFrames=[sample()];
      const next=()=>{window.retargetFrames.push(sample());if(window.retargetFrames.length<13)requestAnimationFrame(next);};
      requestAnimationFrame(next);
    },{once:true,capture:true});
  });
  await page.getByRole('button',{name:/Explore Napoli/}).tap();
  await page.waitForFunction(()=>window.retargetFrames?.length===13);
  const retarget=await page.evaluate(()=>window.retargetFrames);
  // Measure inside the click/frame loop, not across slow automation round trips.
  // The road's maximum Bezier derivative at 2.1 s/segment is below 500 native px/s.
  for(let i=1;i<retarget.length;i++)assert(Math.hypot(retarget[i].x-retarget[i-1].x,retarget[i].y-retarget[i-1].y)<=500*(retarget[i].t-retarget[i-1].t)/1000+1,'retarget follows a continuous path from its current position');
 await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle');
 const here=await traveler.boundingBox();await page.getByRole('button',{name:/Explore Napoli/}).tap();await page.waitForTimeout(250);
 assert.deepEqual(await traveler.boundingBox(),here);assert.equal(await traveler.getAttribute('data-motion'),'idle');
 await page.getByRole('button',{name:/Explore Venezia/}).tap();await page.waitForFunction(()=>document.querySelector('[data-yoppo-traveler]').dataset.motion==='idle');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),progressKey),progress);
 await page.locator('.yo-map-continue').tap();
 await page.locator('[data-yoppo-taxi-transition]').waitFor();
 const clip=page.locator('[data-yoppo-taxi-transition] video');assert.equal(await clip.evaluate(v=>v.muted),true);
 await page.getByRole('button',{name:'Skip video'}).tap();
 await page.locator('[data-yoppo-mission-briefing]').waitFor();
 await page.getByRole('button',{name:'Start my mission',exact:true}).tap();
 await page.getByRole('button',{name:'Next expression'}).tap();
 const expression=await page.locator('[data-yoppo-mission-window]').innerText();
 await page.getByRole('button',{name:'Leave and save my place'}).tap();
 assert.equal(await traveler.getAttribute('data-destination-index'),'3');
 await page.locator('.yo-map-continue').tap();assert.equal(await page.locator('[data-yoppo-taxi-transition]').count(),0);
 assert.equal(await page.locator('[data-yoppo-mission-window]').innerText(),expression,'resume is exact');
 await page.getByRole('button',{name:'Leave and save my place'}).tap();
 await page.screenshot({path:'.qa-guided/map/mission-closed.png'});
 const afterMission=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),progressKey));
 for(const key of ['assessments','activities','productions'])assert.deepEqual(afterMission[key],JSON.parse(progress)[key],'mission navigation cannot award '+key);
 assert.deepEqual(errors,[]);
 await context.close();
 const reduced=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await reduced.addInitScript(data=>{for(const[k,v]of Object.entries(data))localStorage.setItem(k,v)},fixture);
 const r=await reduced.newPage();await r.goto(base+'/?unit=u06&start=u12&lang=en');await r.locator('[data-yoppo-traveler]').waitFor();
 await r.getByRole('button',{name:/Explore Venezia/}).tap();
 assert.equal(await r.locator('[data-yoppo-traveler]').getAttribute('data-motion'),'idle');
 assert.equal(await r.locator('[data-yoppo-traveler]').evaluate(n=>n.style.top),'86%');
 assert.equal(await r.locator('.yo-map-leg-front').evaluate(n=>getComputedStyle(n).animationName),'none');
 await r.locator('.yo-map-continue').tap();await r.locator('[data-yoppo-taxi-transition]').waitFor();
 assert.equal(await r.locator('video').evaluate(v=>v.paused),true);assert.equal(await r.locator('video').evaluate(v=>v.currentTime),0);
 await r.getByRole('button',{name:'Skip video'}).tap();await r.locator('[data-yoppo-mission-briefing]').waitFor();await reduced.close();
 const locked=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const l=await locked.newPage();
 await l.goto(base+'/?unit=u01&start=u01&lang=en');await l.locator('[data-yoppo-traveler]').waitFor();
 const lockProgress=await l.evaluate(k=>localStorage.getItem(k),progressKey);const lockPos=await l.locator('[data-yoppo-traveler]').boundingBox();
 await l.locator('[data-yoppo-map-token=u02]').tap();assert.equal(await l.getByRole('button',{name:/Explore Parma/}).count(),0);
 assert.deepEqual(await l.locator('[data-yoppo-traveler]').boundingBox(),lockPos);assert.equal(await l.evaluate(k=>localStorage.getItem(k),progressKey),lockProgress);
 await locked.close();
  await fs.writeFile('.qa-guided/map/verified.json',JSON.stringify({browser:browser.version(),frames:first,roadError,retarget,errors,checks:['Firenze to Venezia','return walk','mid-walk retarget','idle current city','stable guide, road and stored progress','stable URL, scroll, artwork and map','animated feet','same SVG road geometry','Continue opens taxi and mission','mission resume','reduced motion teleport and paused taxi','locked city']},null,2));
 console.log('Mobile map interaction verification: PASS; '+first.length+' captured frames');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exit(1)});
