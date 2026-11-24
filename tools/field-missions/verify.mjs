import assert from "node:assert/strict";
import {createServer} from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {chromium} from "playwright";
const require=createRequire(import.meta.url),{fieldMissions}=require("../../lib/yo/scenarios/fieldMissions.ts");
const root=fileURLToPath(new URL("../../public/",import.meta.url));
const mime={html:"text/html",js:"application/javascript",css:"text/css",mp3:"audio/mpeg",woff2:"font/woff2",webp:"image/webp",png:"image/png",webmanifest:"application/manifest+json"};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,"http://localhost");
  if(!/^\/practice\/field\/[\w./-]+$/.test(url.pathname)){res.writeHead(404).end();return;}
  try{const file=path.join(root,url.pathname),data=await fs.readFile(file);res.writeHead(200,{"Content-Type":mime[file.split(".").pop()]||"application/octet-stream"}).end(data);}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
let browser;
try{
  browser=await chromium.launch();
  const origin="http://127.0.0.1:"+server.address().port;
  for(const mission of fieldMissions){
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:"America/Toronto",reducedMotion:"reduce"});
    try{
      const page=await ctx.newPage(),errors=[];
      page.on("pageerror",e=>errors.push(String(e)));ctx.on("request",r=>{if(new URL(r.url()).origin!==origin)errors.push(r.url());});
      const response=await page.goto(origin+"/practice/field/"+mission.id+"/index.html?lang=fr");
      assert.equal(response.status(),200);
      await page.getByRole("heading",{name:mission.title.fr}).waitFor();await page.getByText("Disponible hors ligne",{exact:true}).waitFor();
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      for(const width of [320,390,1100]){
        await page.setViewportSize({width,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      await page.setViewportSize({width:390,height:844});await ctx.setOffline(true);await page.reload();
      const decoded=await page.evaluate(async ids=>{
        const ac=new AudioContext();try{return await Promise.all(ids.map(async id=>{
          const url="./"+id+".mp3",response=await fetch(url),data=await ac.decodeAudioData(await response.arrayBuffer());
          const range=await fetch(url,{headers:{range:"bytes=0-3"}});return data.duration>0.12&&range.status===206&&(await range.arrayBuffer()).byteLength===4;
        }));}finally{await ac.close();}
      },mission.lines.map(l=>l.id));assert.ok(decoded.every(Boolean));
      const button=name=>page.getByRole("button",{name,exact:true});
      let heard=false;
      for(const [i,b] of mission.visits.guided.beats.entries()){
        if(i===1)await page.reload();
        await page.getByRole("heading",{name:b.task.fr}).waitFor();
        if("clip" in b.prompt){
          if(!heard){await button("Écouter").click();await page.waitForFunction(()=>!document.querySelector(".choices button").disabled);heard=true;}
          else await button("Lire la réplique").click();
        }
        if(i===0){await button("Un indice, Yoppo ?").click();await page.getByText(b.hint.fr,{exact:true}).waitFor();}
        await button(b.answer).click();
      }
      await page.getByRole("heading",{name:mission.finish.fr}).waitFor();
      const due=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).due,mission.key);
      await page.clock.setFixedTime(new Date(due-1));await page.reload();assert.equal(await button("Ouvrir le défi").count(),0);
      await page.clock.setFixedTime(new Date(due));await page.reload();
      for(const [i,b] of mission.visits.tomorrow.beats.entries()){
        await page.getByRole("heading",{name:b.task.fr}).waitFor();
        if("clip" in b.prompt)await button("Lire la réplique").click();
        if(i===0){assert.equal(await button("Un indice, Yoppo ?").count(),0);await button(b.choices.find(c=>c!==b.answer)).click();}
        await button(b.answer).click();
      }
      await page.getByText("Défi réussi après correction.").waitFor();assert.deepEqual(errors,[]);console.log("PASS",mission.id,"offline, playback, resume, midnight, transfer and 3 widths");
    }finally{await ctx.close();}
  }
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
