import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {build} from "esbuild";
import sharp from "sharp";
const require=createRequire(import.meta.url);
const {fieldMissions}=require("../../lib/yo/scenarios/fieldMissions.ts");
const {sourceRecordings}=require("./sources.ts");
const here=fileURLToPath(new URL(".",import.meta.url)),root=path.resolve(here,"../.."),dest=path.join(root,"public/practice/field");
const worker=await fs.readFile(path.join(root,"tools/italy-by-train/sw.js"),"utf8");
const html=await fs.readFile(path.join(root,"tools/hotel-check-in/index.html"),"utf8");
for(const mission of fieldMissions){
  const out=path.join(dest,mission.id);
  await fs.mkdir(out,{recursive:true});
  await build({stdin:{contents:`import {mountPractice} from "../hotel-check-in/Hotel";mountPractice(${JSON.stringify(mission)})`,resolveDir:here},outfile:path.join(out,"app.js"),bundle:true,minify:true,jsx:"automatic",target:"safari16",external:["./inter.woff2"],define:{"process.env.NODE_ENV":'"production"'}});
  const assets={"icon.png":"icon-192.png","inter.woff2":"fonts/inter.woff2","yoppo.png":"companion/travel/companion-travel-teacher-ready.png","happy.png":"companion/travel/companion-travel-celebrating.png"};
  for(const [name,src] of Object.entries(assets))await fs.copyFile(path.join(root,"public",src),path.join(out,name));
  await sharp(path.join(root,"public",mission.image)).resize({width:850,withoutEnlargement:true}).webp({quality:84}).toFile(path.join(out,"desk.webp"));
  const clips=[];
  for(const {id,storagePath} of sourceRecordings(mission)){
    const name=id+".mp3",local=path.join(root,"public/audio",storagePath);
    let src=local;
    try{await fs.access(local);}catch{src=path.join(here,"recordings",mission.id,name);}
    await fs.copyFile(src,path.join(out,name));clips.push(name);
  }
  await fs.writeFile(path.join(out,"index.html"),html.replace("En recepción · YoPratiqo",mission.title.fr+" · YoPratiqo"));
  await fs.writeFile(path.join(out,"manifest.webmanifest"),JSON.stringify({id:"./index.html",scope:"./",start_url:"./index.html",name:"YoPratiqo · "+mission.title.fr,short_name:mission.title.fr,display:"standalone",icons:[{src:"./icon.png",sizes:"192x192",type:"image/png"}]}));
  const files=["index.html","app.js","app.css","desk.webp","manifest.webmanifest",...Object.keys(assets),...clips],hash=createHash("sha256");
  for(const f of files)hash.update(f).update(await fs.readFile(path.join(out,f)));
  const rev=hash.update(worker).digest("hex").slice(0,16);
  await fs.writeFile(path.join(out,"sw.js"),"const PACK="+JSON.stringify(files)+",REVISION="+JSON.stringify(rev)+";\n"+worker);
  console.log(mission.id,files.length,"offline assets",rev);
}
const links=fieldMissions.map(m=>`<li><a href="./${m.id}/index.html">${m.title.fr}</a></li>`).join("");
await fs.writeFile(path.join(dest,"index.html"),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Les missions de terrain | YoPratiqo</title><style>body{font:1.1rem system-ui;color:#193e34;max-width:38rem;margin:auto;padding:2rem 1.2rem}ul{list-style:none;padding:0}a{display:block;padding:1rem 0;color:#125a47;border-bottom:1px solid #bccfc9}</style><main><p>YoPratiqo</p><h1>Missions de terrain</h1><ul>'+links+'</ul></main></html>');
