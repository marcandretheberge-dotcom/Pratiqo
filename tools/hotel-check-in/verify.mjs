import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {createRequire} from "node:module";
const {visits,lines,key}=createRequire(import.meta.url)("../../lib/yo/scenarios/checkIn.ts");
const dir=new URL("../../.qa-guided/hotel/",import.meta.url);
const access=JSON.parse(await fs.readFile(new URL("access.json",dir)));
const addr=(process.argv.includes("--public")?access.public:access.local);
assert.ok(addr);
const b=await chromium.launch();
try{
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:"en-CA",timezoneId:"America/Toronto",isMobile:true,hasTouch:true,reducedMotion:"reduce"});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on("pageerror",e=>errors.push(e.message));ctx.on("request",r=>{if(new URL(r.url()).origin!==new URL(addr).origin)external.push(r.url());});
 await page.clock.setFixedTime(new Date("2026-11-23T20:00:00Z"));
 const response=await page.goto(addr+"?lang=en");assert.equal(response.status(),200);
 const ready=page.getByText("Available offline",{exact:true});await ready.waitFor({timeout:60000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 for(const path of ["/","/api","/.env"]){assert.equal((await ctx.request.get(new URL(path,addr).href)).status(),404);}
 assert.equal((await ctx.request.post(addr)).status(),405);
 for(const w of [320,390,1100]){
   await page.setViewportSize({width:w,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(w!==320)await page.screenshot({path:fileURLToPath(new URL("hotel-"+w+".png",dir)),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await ctx.setOffline(true);await page.reload();await ready.waitFor();
 const decoded=await page.evaluate(async ids=>{
   const audio=new AudioContext();try{return await Promise.all(ids.map(async id=>{
     const r=await fetch("./"+id+".mp3");if(r.status!==200)throw Error("Not cached: "+id);
     const clip=await audio.decodeAudioData(await r.arrayBuffer());return clip.duration;
   }));}finally{await audio.close();}
 },lines.map(l=>l.id));
 assert.ok(decoded.every(n=>n>0.12));
 const range=await page.evaluate(async()=>{const r=await fetch("./hotel-07.mp3",{headers:{Range:"bytes=0-3"}});return [r.status,(await r.arrayBuffer()).byteLength];});
 assert.deepEqual(range,[206,4]);
 const button=(name)=>page.getByRole("button",{name,exact:true});
 const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 for(const [i,beat] of visits.guided.beats.entries()){
   if(i===1){await page.reload();await page.getByRole("heading",{name:beat.task.en}).waitFor();}
   if("clip" in beat.prompt){
     assert.ok(await button(beat.answer).isDisabled());
     if(i===0){await button("Listen").click();await button(beat.answer).waitFor();await page.waitForFunction(()=>!document.querySelector(".choices button").disabled);}
     else await button("Read the line").click();
   }
   if(i===0){await button("A hint, Yoppo?").click();await page.getByText(beat.hint.en).waitFor();await button(beat.choices.find(c=>c!==beat.answer)).click();assert.equal((await saved()).guided,0);}
   await button(beat.answer).click();
 }
 await page.getByRole("heading",{name:"Here’s your key!"}).waitFor();
 const first=await saved();assert.equal(first.guided,6);
 await page.locator("summary").click();
 await page.getByRole("button",{name:"Listen again",exact:true}).first().click();
 await page.getByRole("button",{name:"Pause",exact:true}).waitFor();
 await page.clock.setFixedTime(new Date(first.due-1));await page.reload();await page.getByRole("heading",{name:"Here’s your key!"}).waitFor();
 assert.equal(await button("Open the challenge").count(),0);
 await page.clock.setFixedTime(new Date(first.due));await page.reload();await page.getByText("Next-day challenge",{exact:true}).waitFor();
 assert.equal(await button("A hint, Yoppo?").count(),0);
 for(const [i,beat] of visits.tomorrow.beats.entries()){
   if("clip" in beat.prompt)await button("Read the line").click();
   if(i===0){await button(beat.choices.find(c=>c!==beat.answer)).click();await page.getByText("Check the situation and try again.").waitFor();}
   await button(beat.answer).click();
 }
 await page.getByText("Completed after a correction.").waitFor();
 for(const [lang,title] of [["fr","Malentendu résolu !"],["es","¡Malentendido resuelto!"]]){
   await page.getByRole("combobox").selectOption(lang);await page.reload();await page.getByRole("heading",{name:title}).waitFor();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log("PASS: isolated HTTPS/local entry, 3 widths, offline reload + resume, 9 decoded MP3s, audible-task playback completion, 206 range, calendar unlock, corrections, FR/EN/ES, 0 page errors or external requests.");
}finally{await b.close();}
