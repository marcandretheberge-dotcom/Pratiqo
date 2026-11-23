import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import {createHash} from "node:crypto";
const src=fileURLToPath(new URL(".",import.meta.url)),root=path.resolve(src,"../..");
const out=path.resolve(root,"public/practice/it/bologna");
const require=createRequire(import.meta.url),{build}=require("esbuild");
await fs.mkdir(out,{recursive:true});
await build({entryPoints:[path.join(src,"TrainPreview.tsx")],outfile:path.join(out,"app.js"),bundle:true,minify:true,jsx:"automatic",target:"safari16",
  nodePaths:[path.dirname(path.dirname(require.resolve("react/package.json")))],external:["./inter.woff2"],define:{"process.env.NODE_ENV":'"production"'}});
const assets={"bologna.webp":"images/yo/italian/culture/bologna-porticoes.webp","map.png":"companion/travel/companion-travel-map.png","happy.png":"companion/travel/companion-travel-celebrating.png","idle.png":"companion/travel/companion-travel-idle.png","icon.png":"icon-192.png","inter.woff2":"fonts/inter.woff2"};
for(const [name,file] of Object.entries(assets))await fs.copyFile(path.join(root,"public",file),path.join(out,name));
await fs.copyFile(path.join(src,"index.html"),path.join(out,"index.html"));
await fs.writeFile(path.join(out,"manifest.webmanifest"),JSON.stringify({id:"./index.html",scope:"./",start_url:"./index.html",name:"YoPratiqo · Italy by train",short_name:"Italy by train",display:"standalone",theme_color:"#175c48",background_color:"#ffffff",icons:[{src:"./icon.png",sizes:"192x192",type:"image/png"}]}));
const files=["index.html","app.js","app.css","manifest.webmanifest",...Object.keys(assets)];
const hash=createHash("sha256");let size=0;
for(const f of files){const bytes=await fs.readFile(path.join(out,f));hash.update(f).update(bytes);size+=bytes.length;}
const worker=await fs.readFile(path.join(src,"sw.js"),"utf8");
const revision=hash.update(worker).digest("hex").slice(0,16);
await fs.writeFile(path.join(out,"sw.js"),"const PACK="+JSON.stringify([...files,"ask.mp3","platform.mp3"])+",REVISION="+JSON.stringify(revision)+";\n"+worker);
console.log("Bologna offline pack:",revision,size,"static bytes + 2 published recordings.");
