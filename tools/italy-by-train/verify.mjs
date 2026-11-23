import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("playwright");
const dir=new URL("../../.qa-guided/italy-by-train/",import.meta.url);
await fs.mkdir(dir,{recursive:true});
const address=new URL("/practice/it/bologna/index.html?lang=en",process.env.SCENARIO_TEST_ORIGIN??"http://127.0.0.1:55791").href;
const browser=await chromium.launch();
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:"en-CA",timezoneId:"America/Toronto",reducedMotion:"reduce",isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on("pageerror",e=>errors.push(e.message));ctx.on("request",r=>{if(new URL(r.url()).origin!==new URL(address).origin)external.push(r.url());});
 await page.clock.setFixedTime(new Date("2026-11-23T15:00:00Z"));
 const result=await page.goto(address);assert.equal(result.status(),200);
 await page.getByText("Available offline on this device").waitFor({timeout:60000});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 assert.equal(new URL(await page.getByRole("link",{name:"Back to the map"}).getAttribute("href"),address).pathname,"/yo/langues/italien/parcours/u01");
 async function size(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"No horizontal overflow");}
 await size();
 await page.screenshot({path:new URL("train-phone.png",dir).pathname.replace(/^\/(\w:)/,"$1"),fullPage:true});
 await page.setViewportSize({width:320,height:690});await size();
 await page.setViewportSize({width:1100,height:820});await size();
 await page.screenshot({path:new URL("train-desktop.png",dir).pathname.replace(/^\/(\w:)/,"$1"),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await ctx.setOffline(true);await page.reload();await page.getByText("Available offline on this device").waitFor();
 await page.getByRole("button",{name:/08:05 Firenze/}).click();await page.getByRole("status").filter({hasText:"Match the departure time"}).waitFor();
 await page.getByRole("button",{name:/08:20 Firenze/}).click();
 await page.reload();await page.getByRole("heading",{name:"Ask which platform it leaves from."}).waitFor();
 // Observe a real playback clock, not just a button changing state.
 await page.evaluate(()=>{window.trainPlayed=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.addEventListener("timeupdate",()=>{if(this.currentTime>0)window.trainPlayed.push(this.currentSrc);});return play.call(this);};});
 await page.getByRole("button",{name:"Listen",exact:true}).click();await page.waitForFunction(()=>window.trainPlayed.some(s=>s.endsWith("/ask.mp3")));
 await page.getByRole("button",{name:/Da quale binario parte il treno/}).click();
 assert.ok(await page.getByRole("button",{name:"Binario 3"}).isDisabled());
 await page.getByRole("button",{name:"Play announcement"}).click();await page.waitForFunction(()=>window.trainPlayed.some(s=>s.endsWith("/platform.mp3")));
 const range=await page.evaluate(async()=>{const r=await fetch("./platform.mp3",{headers:{Range:"bytes=1-4"}});return [r.status,(await r.arrayBuffer()).byteLength];});assert.deepEqual(range,[206,4]);
 await page.getByRole("button",{name:"Read announcement"}).click();await page.getByText("Il treno parte dal binario tre.").waitFor();
 await page.getByRole("button",{name:"Binario 3"}).click();await page.getByText("Your challenge opens tomorrow.",{exact:false}).waitFor();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("yo.scenario.it.bologna.train.v1")));
 const before=await saved();assert.equal(before.tomorrow.step,0);
 await page.getByRole("button",{name:/Try another line/}).click();
 await page.getByRole("button",{name:/10:40 Modena/}).click();await page.getByRole("button",{name:/Da quale binario parte/}).click();await page.getByRole("button",{name:"Binario 1",exact:true}).click();
 assert.deepEqual(await saved(),before);
 // Reopen at midnight on the next device-local date, still with no network.
 await page.clock.setFixedTime(new Date(before.due));await page.reload();
 await page.getByText("Day 2 · No-hint challenge").waitFor();
 assert.equal(await page.getByRole("button",{name:"Hint",exact:true}).count(),0);
 await page.getByRole("button",{name:/09:15 Parma/}).click();await page.reload();
 await page.getByRole("button",{name:/Da quale binario parte/}).click();
 await page.getByRole("button",{name:"Binario 2",exact:true}).click();
 await page.getByRole("button",{name:"Binario 6",exact:true}).click();await page.getByText("Completed after correction").waitFor();
 assert.equal((await saved()).tomorrow.step,3);
 await page.getByRole("combobox").selectOption("fr");await page.getByText("Réussi après correction").waitFor();
 await page.getByRole("combobox").selectOption("es");await page.getByText("Completado tras corregir").waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log("PASS:",new URL(address).hostname,"download, 320/390/1100 layouts, offline reopen, resume, two decoded recordings, 206 range, practice isolation, midnight unlock, retries, FR/EN/ES, zero page errors or external requests.");
}finally{await browser.close();}
